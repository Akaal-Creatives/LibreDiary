import { createTransport, type Transporter } from 'nodemailer';
import { env } from '../config/index.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            }
          : undefined,
    });
  }
  return transporter;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const transport = getTransporter();

  await transport.sendMail({
    from: env.SMTP_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text ?? stripHtml(options.html),
  });
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * Base email template wrapper
 */
function emailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LibreDiary</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #374151;
      background-color: #f3f4f6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo-text {
      font-size: 24px;
      font-weight: 600;
      color: #111827;
    }
    .logo-icon {
      color: #6366f1;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 16px 0;
    }
    p {
      margin: 0 0 16px 0;
    }
    .button {
      display: inline-block;
      background: #6366f1;
      color: #ffffff !important;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      margin: 16px 0;
    }
    .button:hover {
      background: #4f46e5;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      font-size: 14px;
      color: #6b7280;
    }
    .code {
      background: #f3f4f6;
      padding: 12px 16px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 14px;
      margin: 16px 0;
      word-break: break-all;
    }
    .muted {
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <span class="logo-icon">&#128218;</span>
        <span class="logo-text">LibreDiary</span>
      </div>
      ${content}
    </div>
    <div class="footer">
      <p>LibreDiary - Your collaborative workspace</p>
      <p class="muted">Developed by Akaal Creatives</p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  name?: string | null
): Promise<void> {
  const verifyUrl = `${env.APP_URL}/verify-email/${token}`;
  const greeting = name ? `Hi ${name},` : 'Hi,';

  await sendEmail({
    to: email,
    subject: 'Verify your email - LibreDiary',
    html: emailTemplate(`
      <h1>Verify your email</h1>
      <p>${greeting}</p>
      <p>Please verify your email address by clicking the button below:</p>
      <p style="text-align: center;">
        <a href="${verifyUrl}" class="button">Verify Email</a>
      </p>
      <p class="muted">Or copy and paste this link into your browser:</p>
      <div class="code">${verifyUrl}</div>
      <p class="muted">This link will expire in 24 hours.</p>
      <p class="muted">If you didn't create an account, you can safely ignore this email.</p>
    `),
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  name?: string | null
): Promise<void> {
  const resetUrl = `${env.APP_URL}/reset-password/${token}`;
  const greeting = name ? `Hi ${name},` : 'Hi,';

  await sendEmail({
    to: email,
    subject: 'Reset your password - LibreDiary',
    html: emailTemplate(`
      <h1>Reset your password</h1>
      <p>${greeting}</p>
      <p>We received a request to reset your password. Click the button below to choose a new one:</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </p>
      <p class="muted">Or copy and paste this link into your browser:</p>
      <div class="code">${resetUrl}</div>
      <p class="muted">This link will expire in 1 hour.</p>
      <p class="muted">If you didn't request a password reset, you can safely ignore this email.</p>
    `),
  });
}

/**
 * Send organization invite email
 */
export async function sendInviteEmail(
  email: string,
  token: string,
  organizationName: string,
  inviterName: string
): Promise<void> {
  const inviteUrl = `${env.APP_URL}/register/${token}`;

  await sendEmail({
    to: email,
    subject: `You've been invited to join ${organizationName} on LibreDiary`,
    html: emailTemplate(`
      <h1>You're invited!</h1>
      <p>Hi,</p>
      <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on LibreDiary.</p>
      <p>LibreDiary is a collaborative workspace where you can create and share documents, notes, and more.</p>
      <p style="text-align: center;">
        <a href="${inviteUrl}" class="button">Accept Invitation</a>
      </p>
      <p class="muted">Or copy and paste this link into your browser:</p>
      <div class="code">${inviteUrl}</div>
      <p class="muted">This invitation will expire in 7 days.</p>
    `),
  });
}

// ===========================================
// NOTIFICATION EMAIL TEMPLATES
// ===========================================

export interface MentionNotificationEmailInput {
  to: string;
  recipientName: string;
  actorName: string;
  pageTitle: string;
  pageUrl: string;
}

/**
 * Send email when someone mentions a user in a comment
 */
export async function sendMentionNotificationEmail(
  input: MentionNotificationEmailInput
): Promise<void> {
  const greeting = input.recipientName ? `Hi ${input.recipientName},` : 'Hi,';

  await sendEmail({
    to: input.to,
    subject: `${input.actorName} mentioned you in "${input.pageTitle}"`,
    html: emailTemplate(`
      <h1>You were mentioned</h1>
      <p>${greeting}</p>
      <p><strong>${input.actorName}</strong> mentioned you in a comment on <strong>"${input.pageTitle}"</strong>.</p>
      <p style="text-align: center;">
        <a href="${input.pageUrl}" class="button">View Page</a>
      </p>
      <p class="muted">Or copy and paste this link into your browser:</p>
      <div class="code">${input.pageUrl}</div>
    `),
  });
}

export interface CommentReplyNotificationEmailInput {
  to: string;
  recipientName: string;
  actorName: string;
  pageTitle: string;
  pageUrl: string;
}

/**
 * Send email when someone replies to a user's comment
 */
export async function sendCommentReplyNotificationEmail(
  input: CommentReplyNotificationEmailInput
): Promise<void> {
  const greeting = input.recipientName ? `Hi ${input.recipientName},` : 'Hi,';

  await sendEmail({
    to: input.to,
    subject: `${input.actorName} replied to your comment`,
    html: emailTemplate(`
      <h1>New reply to your comment</h1>
      <p>${greeting}</p>
      <p><strong>${input.actorName}</strong> replied to your comment on <strong>"${input.pageTitle}"</strong>.</p>
      <p style="text-align: center;">
        <a href="${input.pageUrl}" class="button">View Comment</a>
      </p>
      <p class="muted">Or copy and paste this link into your browser:</p>
      <div class="code">${input.pageUrl}</div>
    `),
  });
}

export interface PageSharedNotificationEmailInput {
  to: string;
  recipientName: string;
  actorName: string;
  pageTitle: string;
  pageUrl: string;
  permissionLevel: string;
}

/**
 * Send email when someone shares a page with a user
 */
export async function sendPageSharedNotificationEmail(
  input: PageSharedNotificationEmailInput
): Promise<void> {
  const greeting = input.recipientName ? `Hi ${input.recipientName},` : 'Hi,';
  const permissionText = input.permissionLevel.toLowerCase().replace('_', ' ');

  await sendEmail({
    to: input.to,
    subject: `${input.actorName} shared "${input.pageTitle}" with you`,
    html: emailTemplate(`
      <h1>A page was shared with you</h1>
      <p>${greeting}</p>
      <p><strong>${input.actorName}</strong> shared a page with you: <strong>"${input.pageTitle}"</strong>.</p>
      <p>You have <strong>${permissionText}</strong> access to this page.</p>
      <p style="text-align: center;">
        <a href="${input.pageUrl}" class="button">View Page</a>
      </p>
      <p class="muted">Or copy and paste this link into your browser:</p>
      <div class="code">${input.pageUrl}</div>
    `),
  });
}

export interface CommentResolvedNotificationEmailInput {
  to: string;
  recipientName: string;
  actorName: string;
  pageTitle: string;
  pageUrl: string;
}

/**
 * Send email when someone resolves a user's comment
 */
export async function sendCommentResolvedNotificationEmail(
  input: CommentResolvedNotificationEmailInput
): Promise<void> {
  const greeting = input.recipientName ? `Hi ${input.recipientName},` : 'Hi,';

  await sendEmail({
    to: input.to,
    subject: 'Your comment was resolved',
    html: emailTemplate(`
      <h1>Your comment was resolved</h1>
      <p>${greeting}</p>
      <p><strong>${input.actorName}</strong> resolved your comment on <strong>"${input.pageTitle}"</strong>.</p>
      <p style="text-align: center;">
        <a href="${input.pageUrl}" class="button">View Page</a>
      </p>
      <p class="muted">Or copy and paste this link into your browser:</p>
      <div class="code">${input.pageUrl}</div>
    `),
  });
}
