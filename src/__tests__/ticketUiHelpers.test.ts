import {
  deliveredStatusTick,
  ticketPriorityLabel,
  ticketPriorityVariant,
  ticketStatusLabel,
  ticketStatusVariant,
} from '../features/tickets/utils/ticketUiHelpers';

describe('ticket status/priority labels', () => {
  it('labels every backend status value (constants/index.js ticketStatus)', () => {
    expect(ticketStatusLabel('open')).toBe('Open');
    expect(ticketStatusLabel('in_progress')).toBe('In Progress');
    expect(ticketStatusLabel('waiting_on_customer')).toBe('Waiting on Customer');
    expect(ticketStatusLabel('resolved')).toBe('Resolved');
    expect(ticketStatusLabel('closed')).toBe('Closed');
    expect(ticketStatusLabel('reopened')).toBe('Reopened');
  });

  it('labels every backend priority value (constants/index.js ticketPriority)', () => {
    expect(ticketPriorityLabel('low')).toBe('Low');
    expect(ticketPriorityLabel('medium')).toBe('Medium');
    expect(ticketPriorityLabel('high')).toBe('High');
    expect(ticketPriorityLabel('urgent')).toBe('Urgent');
  });

  it('gives urgent/reopened the most alarming pill variants', () => {
    expect(ticketPriorityVariant('urgent')).toBe('danger');
    expect(ticketStatusVariant('reopened')).toBe('danger');
    expect(ticketStatusVariant('resolved')).toBe('success');
  });
});

describe('deliveredStatusTick', () => {
  it('returns null for inbound messages (no delivered_status)', () => {
    expect(deliveredStatusTick(null)).toBeNull();
    expect(deliveredStatusTick(undefined)).toBeNull();
  });

  it('maps every backend deliveredStatus value (constants/index.js)', () => {
    expect(deliveredStatusTick('pending')?.glyph).toBe('🕓');
    expect(deliveredStatusTick('sent')?.glyph).toBe('✓');
    expect(deliveredStatusTick('delivered')?.glyph).toBe('✓✓');
    expect(deliveredStatusTick('read')?.glyph).toBe('✓✓');
    expect(deliveredStatusTick('failed')?.glyph).toBe('⚠');
  });

  it('flags read as info and failed as danger, distinct from delivered', () => {
    expect(deliveredStatusTick('read')?.variant).toBe('info');
    expect(deliveredStatusTick('failed')?.variant).toBe('danger');
    expect(deliveredStatusTick('delivered')?.variant).toBe('neutral');
  });
});
