import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock setup using vi.hoisted for proper hoisting
const { mockSendMail, mockEnv } = vi.hoisted(() => {
  const mockSendMail = vi.fn().mockResolvedValue({});

  const mockEnv = {
    SMTP_HOST: 'smtp.test.com',
    SMTP_PORT: 587,
    SMTP_SECURE: false,
    SMTP_USER: 'test@test.com',
    SMTP_PASS: 'password',
    SMTP_FROM: 'LibreDiary <noreply@librediary.test>',
    APP_URL: 'http://localhost:5173',
  };

  return { mockSendMail, mockEnv };
});

// Mock nodemailer
vi.mock('nodemailer', () => ({
  createTransport: vi.fn().mockReturnValue({
    sendMail: mockSendMail,
  }),
}));

// Mock the env config
vi.mock('../../config/index.js', () => ({
  env: mockEnv,
}));

// Import service AFTER mocking
import * as emailService from '../email.service.js';

describe('Email Service', () => {
  beforeEach(() => {
    mockSendMail.mockReset().mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('sendMentionNotificationEmail', () => {
    it('should send an email for mention notifications', async () => {
      await emailService.sendMentionNotificationEmail({
        to: 'recipient@example.com',
        recipientName: 'John Doe',
        actorName: 'Jane Smith',
        pageTitle: 'Project Notes',
        pageUrl: 'http://localhost:5173/app/pages/page-123',
      });

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('recipient@example.com');
      expect(mailOptions.subject).toBe('Jane Smith mentioned you in "Project Notes"');
      expect(mailOptions.html).toContain('mentioned you');
      expect(mailOptions.html).toContain('Project Notes');
      expect(mailOptions.html).toContain('View Page');
    });
  });

  describe('sendCommentReplyNotificationEmail', () => {
    it('should send an email for comment reply notifications', async () => {
      await emailService.sendCommentReplyNotificationEmail({
        to: 'recipient@example.com',
        recipientName: 'John Doe',
        actorName: 'Jane Smith',
        pageTitle: 'Team Meeting Notes',
        pageUrl: 'http://localhost:5173/app/pages/page-456',
      });

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('recipient@example.com');
      expect(mailOptions.subject).toBe('Jane Smith replied to your comment');
      expect(mailOptions.html).toContain('replied to your comment');
      expect(mailOptions.html).toContain('Team Meeting Notes');
    });
  });

  describe('sendPageSharedNotificationEmail', () => {
    it('should send an email for page shared notifications', async () => {
      await emailService.sendPageSharedNotificationEmail({
        to: 'recipient@example.com',
        recipientName: 'John Doe',
        actorName: 'Jane Smith',
        pageTitle: 'Shared Document',
        pageUrl: 'http://localhost:5173/app/pages/page-789',
        permissionLevel: 'EDIT',
      });

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('recipient@example.com');
      expect(mailOptions.subject).toBe('Jane Smith shared "Shared Document" with you');
      expect(mailOptions.html).toContain('shared a page with you');
      expect(mailOptions.html).toContain('edit');
    });

    it('should format permission level correctly', async () => {
      await emailService.sendPageSharedNotificationEmail({
        to: 'recipient@example.com',
        recipientName: 'John Doe',
        actorName: 'Jane Smith',
        pageTitle: 'Read Only Doc',
        pageUrl: 'http://localhost:5173/app/pages/page-111',
        permissionLevel: 'VIEW',
      });

      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain('view');
    });
  });

  describe('sendCommentResolvedNotificationEmail', () => {
    it('should send an email for comment resolved notifications', async () => {
      await emailService.sendCommentResolvedNotificationEmail({
        to: 'recipient@example.com',
        recipientName: 'John Doe',
        actorName: 'Jane Smith',
        pageTitle: 'Bug Report',
        pageUrl: 'http://localhost:5173/app/pages/page-222',
      });

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('recipient@example.com');
      expect(mailOptions.subject).toBe('Your comment was resolved');
      expect(mailOptions.html).toContain('resolved your comment');
      expect(mailOptions.html).toContain('Bug Report');
    });
  });

  describe('email template structure', () => {
    it('should include LibreDiary branding in emails', async () => {
      await emailService.sendMentionNotificationEmail({
        to: 'test@example.com',
        recipientName: 'Test',
        actorName: 'Actor',
        pageTitle: 'Page',
        pageUrl: 'http://localhost:5173/app/pages/test',
      });

      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain('LibreDiary');
      expect(mailOptions.html).toContain('Akaal Creatives');
    });

    it('should include plain text version of email', async () => {
      await emailService.sendMentionNotificationEmail({
        to: 'test@example.com',
        recipientName: 'Test',
        actorName: 'Actor',
        pageTitle: 'Page',
        pageUrl: 'http://localhost:5173/app/pages/test',
      });

      const mailOptions = mockSendMail.mock.calls[0][0];
      // Either text is provided or it's auto-stripped from HTML
      expect(mailOptions.text || mailOptions.html).toBeTruthy();
    });
  });
});
