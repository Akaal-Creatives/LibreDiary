import type { PropertyType } from '@librediary/shared';

export interface DatabaseTemplateProperty {
  name: string;
  type: PropertyType;
  config?: Record<string, unknown>;
}

export interface DatabaseTemplate {
  id: string;
  name: string;
  description: string;
  properties: DatabaseTemplateProperty[];
}

export const databaseTemplates: DatabaseTemplate[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch with just a title property.',
    properties: [],
  },
  {
    id: 'task-tracker',
    name: 'Task Tracker',
    description: 'Track tasks with status, priority, due dates, and assignees.',
    properties: [
      {
        name: 'Status',
        type: 'SELECT',
        config: {
          options: [
            { label: 'To Do', colour: '#6b7280' },
            { label: 'In Progress', colour: '#f59e0b' },
            { label: 'Done', colour: '#22c55e' },
          ],
        },
      },
      {
        name: 'Priority',
        type: 'SELECT',
        config: {
          options: [
            { label: 'Low', colour: '#6b7280' },
            { label: 'Medium', colour: '#f59e0b' },
            { label: 'High', colour: '#ef4444' },
          ],
        },
      },
      { name: 'Due Date', type: 'DATE' },
      { name: 'Assignee', type: 'PERSON' },
    ],
  },
  {
    id: 'bug-tracker',
    name: 'Bug Tracker',
    description: 'Log and track bugs with severity, status, and reporter.',
    properties: [
      {
        name: 'Status',
        type: 'SELECT',
        config: {
          options: [
            { label: 'Open', colour: '#ef4444' },
            { label: 'Investigating', colour: '#f59e0b' },
            { label: 'Fixed', colour: '#22c55e' },
            { label: 'Closed', colour: '#6b7280' },
          ],
        },
      },
      {
        name: 'Severity',
        type: 'SELECT',
        config: {
          options: [
            { label: 'Critical', colour: '#ef4444' },
            { label: 'Major', colour: '#f59e0b' },
            { label: 'Minor', colour: '#3b82f6' },
            { label: 'Trivial', colour: '#6b7280' },
          ],
        },
      },
      { name: 'Reporter', type: 'PERSON' },
      { name: 'Date Reported', type: 'DATE' },
    ],
  },
  {
    id: 'crm',
    name: 'CRM',
    description: 'Manage contacts with company, email, phone, and status.',
    properties: [
      { name: 'Company', type: 'TEXT' },
      { name: 'Email', type: 'EMAIL' },
      { name: 'Phone', type: 'PHONE' },
      {
        name: 'Status',
        type: 'SELECT',
        config: {
          options: [
            { label: 'Lead', colour: '#6b7280' },
            { label: 'Contacted', colour: '#3b82f6' },
            { label: 'Qualified', colour: '#f59e0b' },
            { label: 'Won', colour: '#22c55e' },
            { label: 'Lost', colour: '#ef4444' },
          ],
        },
      },
      { name: 'Last Contact', type: 'DATE' },
    ],
  },
  {
    id: 'sprint-board',
    name: 'Sprint Board',
    description: 'Plan sprints with story points, status, and assignees.',
    properties: [
      {
        name: 'Status',
        type: 'SELECT',
        config: {
          options: [
            { label: 'Backlog', colour: '#6b7280' },
            { label: 'To Do', colour: '#3b82f6' },
            { label: 'In Progress', colour: '#f59e0b' },
            { label: 'In Review', colour: '#8b5cf6' },
            { label: 'Done', colour: '#22c55e' },
          ],
        },
      },
      { name: 'Story Points', type: 'NUMBER' },
      {
        name: 'Sprint',
        type: 'SELECT',
        config: {
          options: [
            { label: 'Sprint 1', colour: '#3b82f6' },
            { label: 'Sprint 2', colour: '#8b5cf6' },
            { label: 'Sprint 3', colour: '#f59e0b' },
          ],
        },
      },
      { name: 'Assignee', type: 'PERSON' },
    ],
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar',
    description: 'Plan content with publish dates, channels, and status.',
    properties: [
      {
        name: 'Status',
        type: 'SELECT',
        config: {
          options: [
            { label: 'Idea', colour: '#6b7280' },
            { label: 'Drafting', colour: '#3b82f6' },
            { label: 'Review', colour: '#f59e0b' },
            { label: 'Scheduled', colour: '#8b5cf6' },
            { label: 'Published', colour: '#22c55e' },
          ],
        },
      },
      { name: 'Publish Date', type: 'DATE' },
      {
        name: 'Channel',
        type: 'MULTI_SELECT',
        config: {
          options: [
            { label: 'Blog', colour: '#3b82f6' },
            { label: 'Social', colour: '#8b5cf6' },
            { label: 'Email', colour: '#f59e0b' },
            { label: 'Video', colour: '#ef4444' },
          ],
        },
      },
      { name: 'Author', type: 'PERSON' },
      { name: 'URL', type: 'URL' },
    ],
  },
];

export function getTemplate(templateId: string): DatabaseTemplate | undefined {
  return databaseTemplates.find((t) => t.id === templateId);
}
