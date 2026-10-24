import { InvitationSnapshot } from '@/types/team'

interface TeamInviteData {
  projectName: string
  inviterName: string
  roleTitle: string
  inviteLink: string
  personalMessage?: string | null
  snapshot: InvitationSnapshot
}

export function buildTeamInvitationEmail(data: TeamInviteData) {
  const { projectName, inviterName, roleTitle, inviteLink, personalMessage, snapshot } = data

  const responsibilitiesHtml = snapshot.responsibilities.length > 0
    ? `
      <div style="margin-top: 20px;">
        <p style="font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 8px;">Core Responsibilities</p>
        <ul style="margin: 0; padding-left: 20px; color: #333; font-size: 14px;">
          ${snapshot.responsibilities.map(r => `
            <li style="margin-bottom: 4px;">
              ${r.title} ${r.is_primary ? '<span style="color: #0284c7; font-size: 11px;">(Primary)</span>' : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `
    : ''

  const objectivesHtml = snapshot.work_plan?.objectives?.length > 0
    ? `
      <div style="margin-top: 20px;">
        <p style="font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 8px;">Initial Objectives</p>
        <ul style="margin: 0; padding-left: 20px; color: #333; font-size: 14px;">
          ${snapshot.work_plan.objectives.map((o: any) => `
            <li style="margin-bottom: 4px;">
              <strong>${o.title}</strong>
              <br><span style="color: #666; font-size: 12px;">Priority: ${o.priority} ${o.due_date ? `| Due: ${o.due_date}` : ''}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `
    : ''

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-w-[600px]; margin: 0 auto; padding: 32px; background-color: #f9fafb; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h2 style="margin: 0; color: #111; font-size: 24px;">You've been invited to join ${projectName}</h2>
      </div>

      <div style="background-color: white; padding: 32px; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
        <p style="font-size: 16px; color: #333; margin-top: 0;">
          <strong>${inviterName}</strong> has invited you to join the team as:
        </p>
        
        <h3 style="font-size: 20px; color: #0284c7; margin: 8px 0 24px 0;">
          ${roleTitle}
        </h3>

        ${personalMessage ? `
          <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 16px; margin-bottom: 24px; border-radius: 0 4px 4px 0;">
            <p style="margin: 0; color: #0369a1; font-style: italic; font-size: 14px;">"${personalMessage}"</p>
          </div>
        ` : ''}

        ${responsibilitiesHtml}
        ${objectivesHtml}

        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="font-size: 14px; color: #666; margin-bottom: 16px;">
            Review the complete role, work plan, and access permissions before accepting.
          </p>
          <a href="${inviteLink}" style="display: inline-block; background-color: #111; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px;">
            Review Invitation
          </a>
        </div>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <p style="font-size: 12px; color: #888;">
          Sent securely via DSRT Connect.<br>
          If you don't know the sender, you can ignore this email.
        </p>
      </div>
    </div>
  `

  return {
    subject: `Invitation: Join ${projectName} as ${roleTitle}`,
    html,
  }
}