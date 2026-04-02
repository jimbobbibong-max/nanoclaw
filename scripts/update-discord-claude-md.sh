#!/bin/bash
# Batch-update Discord group CLAUDE.md files with BEAM-specific context
# Run from nanoclaw root: bash scripts/update-discord-claude-md.sh
set -euo pipefail

GROUPS_DIR="groups"
UPDATED=0
SKIPPED=0

# ─── Templates ───

student_template() {
  local name="$1"
  local grad_year="$2"
  local year_level="$3"
  cat <<EOF
# ${name} — Student Channel

This is a private tutoring channel for ${name} (Year ${year_level}, graduating ${grad_year}).

## Your Role

You are ${name}'s personal BEAM tutor. Refer to the global context (/workspace/global/CLAUDE.md) for pedagogy, safeguarding, and tone.

## Channel Rules

- This is a 1-on-1 tutoring channel. Be warm and personalised.
- Remember what ${name} has been working on (check /workspace/group/conversations/ for history).
- Use Socratic method: hints and guiding questions before answers.
- If ${name} asks about homework, help them understand the method, don't give answers directly.
- Track recurring difficulties and adapt your explanations.
- Year ${year_level} NSW syllabus scope applies to all subject help.
EOF
}

student_no_year_template() {
  local name="$1"
  cat <<EOF
# ${name} — Student Channel

This is a private tutoring channel for ${name}.

## Your Role

You are ${name}'s personal BEAM tutor. Refer to the global context (/workspace/global/CLAUDE.md) for pedagogy, safeguarding, and tone.

## Channel Rules

- This is a 1-on-1 tutoring channel. Be warm and personalised.
- Remember what ${name} has been working on (check /workspace/group/conversations/ for history).
- Use Socratic method: hints and guiding questions before answers.
- If ${name} asks about homework, help them understand the method, don't give answers directly.
- If you don't know their year level, ask early so you can tailor your help.
EOF
}

class_template() {
  local display_name="$1"
  local year_level="$2"
  local subject="$3"
  cat <<EOF
# ${display_name} — Class Channel

This is a group class channel for Year ${year_level} ${subject} at BEAM Academy.

## Your Role

You are the class tutor for this group. Refer to the global context (/workspace/global/CLAUDE.md) for pedagogy, safeguarding, and tone.

## Channel Rules

- Multiple students are in this channel. Address them by name when possible.
- Keep answers focused on Year ${year_level} ${subject} (NSW syllabus).
- Encourage peer discussion: "Does anyone else want to try this one?"
- Use Socratic method, but you can be slightly more direct in group settings since students learn from each other's explanations.
- For worked examples, show full solutions step-by-step.
- If a student asks something off-topic, gently redirect: "Good question, but let's save that for your DM channel."
EOF
}

hw_template() {
  local label="$1"
  cat <<EOF
# ${label} — Homework Channel

This is a homework discussion channel at BEAM Academy.

## Your Role

You are a homework helper. Refer to the global context (/workspace/global/CLAUDE.md) for pedagogy, safeguarding, and tone.

## Channel Rules

- Students post homework questions here. Multiple students may be active.
- **Never give complete homework answers.** Guide students through the method.
- Ask: "What have you tried so far?" before helping.
- After giving a hint, wait for the student to respond before giving more help.
- If a student posts a photo of a worksheet, read the question carefully and help with the specific part they're stuck on.
- Encourage students to show their working.
EOF
}

ops_template() {
  local channel_name="$1"
  local description="$2"
  cat <<EOF
# ${channel_name} — Operations Channel

${description}

## Your Role

This is an internal/admin channel. Refer to the global context (/workspace/global/CLAUDE.md) for tone and language rules.

## Channel Rules

- This channel may include staff, parents, or operational discussions.
- Be professional and concise.
- For student-facing responses forwarded from here, maintain tutoring tone.
- Escalation messages from other channels arrive here. Acknowledge and flag for Taehoon.
EOF
}

# ─── Helpers ───

prettify_name() {
  # discord_ethan-bao-2028 → Ethan Bao
  local raw="$1"
  # Remove discord_ prefix and year suffix
  raw="${raw#discord_}"
  raw=$(echo "$raw" | sed -E 's/-(20[0-9]{2})$//')
  # Also handle 2028-name format
  raw=$(echo "$raw" | sed -E 's/^(20[0-9]{2})-//')
  # Replace hyphens with spaces and title-case
  echo "$raw" | tr '-' ' ' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1'
}

extract_year() {
  # Extract graduation year from folder name
  echo "$1" | grep -oE '20[0-9]{2}' | head -1 || true
}

grad_to_year_level() {
  # Graduation year → current year level (in 2026)
  # Year 12 in grad_year → year_level = 12 - (grad_year - 2026)
  local grad="$1"
  echo $(( 12 - (grad - 2026) ))
}

write_claude_md() {
  local folder="$1"
  local content="$2"
  local target="${GROUPS_DIR}/${folder}/CLAUDE.md"
  echo "$content" > "$target"
  UPDATED=$((UPDATED + 1))
}

# ─── Main ───

for folder in "$GROUPS_DIR"/discord_*; do
  folder_name=$(basename "$folder")

  # Skip if no CLAUDE.md exists (shouldn't happen, but safety)
  if [ ! -d "$folder" ]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  case "$folder_name" in
    # ── Ops/Admin channels ──
    discord_triage)
      write_claude_md "$folder_name" "$(ops_template "Triage" "Escalation and triage channel. Receives alerts from other channels when issues need Taehoon's attention.")"
      ;;
    discord_general)
      write_claude_md "$folder_name" "$(ops_template "General" "General discussion channel for BEAM Academy Discord. Mix of announcements, casual chat, and community.")"
      ;;
    discord_start-here|discord_welcome)
      write_claude_md "$folder_name" "$(ops_template "Welcome" "Onboarding channel for new BEAM students. Help them get set up and find their class channels.")"
      ;;
    discord_support|discord_student-support)
      write_claude_md "$folder_name" "$(ops_template "Student Support" "Student support channel. Help with technical issues, scheduling questions, and general BEAM queries. Escalate billing/enrolment to Taehoon.")"
      ;;
    discord_tex-test)
      write_claude_md "$folder_name" "$(ops_template "TeX Test" "Testing channel for LaTeX rendering and formatting experiments. Not student-facing.")"
      ;;
    discord_y10)
      write_claude_md "$folder_name" "$(ops_template "Year 10 Hub" "Year 10 cohort hub channel. General announcements and coordination for all Year 10 students.")"
      ;;
    discord_y10-ambassador)
      write_claude_md "$folder_name" "$(ops_template "Year 10 Ambassadors" "Ambassador programme channel for Year 10 student leaders. Coordination, planning, and leadership development.")"
      ;;

    # ── HW channels ──
    discord_hw|discord_hw[0-9]|discord_hw[0-9][0-9])
      label=$(echo "$folder_name" | sed 's/discord_//' | tr '[:lower:]' '[:upper:]')
      write_claude_md "$folder_name" "$(hw_template "$label")"
      ;;

    # ── Class channels (y10-subject format) ──
    discord_y10-maths)
      write_claude_md "$folder_name" "$(class_template "Y10 Maths" "10" "Mathematics")"
      ;;
    discord_y10-maths-accel)
      write_claude_md "$folder_name" "$(class_template "Y10 Maths Accelerated" "10" "Mathematics (Accelerated)")"
      ;;
    discord_y10-chem)
      write_claude_md "$folder_name" "$(class_template "Y10 Chemistry" "10" "Chemistry")"
      ;;
    discord_y10-english)
      write_claude_md "$folder_name" "$(class_template "Y10 English" "10" "English")"
      ;;
    discord_y10-english-accel)
      write_claude_md "$folder_name" "$(class_template "Y10 English Accelerated" "10" "English (Accelerated)")"
      ;;
    discord_y10-physics)
      write_claude_md "$folder_name" "$(class_template "Y10 Physics" "10" "Physics")"
      ;;
    discord_y10-nsb-and-girra)
      write_claude_md "$folder_name" "$(class_template "Y10 NSB & Girraween" "10" "Mathematics (NSB & Girraween cohort)")"
      ;;
    discord_baulko-y9-monday)
      write_claude_md "$folder_name" "$(class_template "Baulkham Hills Y9 Monday" "9" "Mathematics (Baulkham Hills Monday class)")"
      ;;
    discord_y8-tuesday)
      write_claude_md "$folder_name" "$(class_template "Y8 Tuesday" "8" "Mathematics (Tuesday class)")"
      ;;
    discord_y11-maths-monday)
      write_claude_md "$folder_name" "$(class_template "Y11 Maths Monday" "11" "Mathematics (Monday class)")"
      ;;

    # ── Class channels (year-N-subject format) ──
    discord_year-10-chemistry)
      write_claude_md "$folder_name" "$(class_template "Year 10 Chemistry" "10" "Chemistry")"
      ;;
    discord_year-10-english)
      write_claude_md "$folder_name" "$(class_template "Year 10 English" "10" "English")"
      ;;
    discord_year-10-english-accel)
      write_claude_md "$folder_name" "$(class_template "Year 10 English Accelerated" "10" "English (Accelerated)")"
      ;;
    discord_year-10-maths-accelerated)
      write_claude_md "$folder_name" "$(class_template "Year 10 Maths Accelerated" "10" "Mathematics (Accelerated)")"
      ;;
    discord_year-10-maths-cherrybrook-tech)
      write_claude_md "$folder_name" "$(class_template "Year 10 Maths Cherrybrook Tech" "10" "Mathematics (Cherrybrook Tech cohort)")"
      ;;
    discord_year-10-maths-chris-kim)
      write_claude_md "$folder_name" "$(class_template "Year 10 Maths Chris Kim" "10" "Mathematics (Chris Kim's class)")"
      ;;
    discord_year-10-maths-normal-a)
      write_claude_md "$folder_name" "$(class_template "Year 10 Maths Normal A" "10" "Mathematics (Normal stream, group A)")"
      ;;
    discord_year-10-maths-normal-b)
      write_claude_md "$folder_name" "$(class_template "Year 10 Maths Normal B" "10" "Mathematics (Normal stream, group B)")"
      ;;
    discord_year-10-physics)
      write_claude_md "$folder_name" "$(class_template "Year 10 Physics" "10" "Physics")"
      ;;
    discord_year-11-maths)
      write_claude_md "$folder_name" "$(class_template "Year 11 Maths" "11" "Mathematics")"
      ;;
    discord_year-8-maths)
      write_claude_md "$folder_name" "$(class_template "Year 8 Maths" "8" "Mathematics")"
      ;;

    # ── Unknown short codes (leave minimal context) ──
    discord_be|discord_bem|discord_bt|discord_ea|discord_kj)
      write_claude_md "$folder_name" "$(ops_template "${folder_name#discord_}" "Channel purpose unclear. Treat as a BEAM Academy channel. Follow global tutoring guidelines.")"
      ;;

    # ── Student DM channels (catch-all with year extraction) ──
    *)
      grad_year=$(extract_year "$folder_name")
      name=$(prettify_name "$folder_name")

      if [ -n "$grad_year" ]; then
        year_level=$(grad_to_year_level "$grad_year")
        write_claude_md "$folder_name" "$(student_template "$name" "$grad_year" "$year_level")"
      else
        write_claude_md "$folder_name" "$(student_no_year_template "$name")"
      fi
      ;;
  esac
done

echo "Done. Updated: $UPDATED, Skipped: $SKIPPED"
