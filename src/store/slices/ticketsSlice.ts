/**
 * Tickets slice — list/detail/audit-log state for the WhatsApp Ticket Chat
 * feature. Follows the same createAsyncThunk + extraReducers pattern as
 * roleSlice.ts (this app's closest example of a fetch-driven slice with
 * pending/fulfilled/rejected handling).
 */

import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  ticketsApi,
  type TicketAuditLogRecord,
  type TicketListQueryParams,
  type TicketPriority,
  type TicketRecord,
  type TicketStatus,
} from '../../services/api/ticketsApi';
import { getApiErrorMessage } from '../../services/api/client';

interface TicketsState {
  list: TicketRecord[];
  listCount: number;
  listLoading: boolean;
  listError: string | null;

  detail: TicketRecord | null;
  detailLoading: boolean;
  detailError: string | null;

  auditLog: TicketAuditLogRecord[];
  auditLogLoading: boolean;
  auditLogError: string | null;

  replyLoading: boolean;
  replyError: string | null;

  raiseLoading: boolean;
  raiseError: string | null;
}

const initialState: TicketsState = {
  list: [],
  listCount: 0,
  listLoading: false,
  listError: null,

  detail: null,
  detailLoading: false,
  detailError: null,

  auditLog: [],
  auditLogLoading: false,
  auditLogError: null,

  replyLoading: false,
  replyError: null,

  raiseLoading: false,
  raiseError: null,
};

export const fetchTicketList = createAsyncThunk<
  { count: number; rows: TicketRecord[] },
  TicketListQueryParams | undefined,
  { rejectValue: string }
>('tickets/fetchList', async (params, { rejectWithValue }) => {
  try {
    const { data } = await ticketsApi.getTicketList(params);
    return { count: data.data.count, rows: data.data.rows };
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error, 'Failed to load tickets'));
  }
});

export const fetchTicketById = createAsyncThunk<
  TicketRecord,
  number | string,
  { rejectValue: string }
>('tickets/fetchById', async (id, { rejectWithValue }) => {
  try {
    const { data } = await ticketsApi.getTicketById(id);
    return data.data;
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error, 'Failed to load ticket'));
  }
});

export const fetchTicketAuditLog = createAsyncThunk<
  TicketAuditLogRecord[],
  number | string,
  { rejectValue: string }
>('tickets/fetchAuditLog', async (id, { rejectWithValue }) => {
  try {
    const { data } = await ticketsApi.getTicketAuditLog(id);
    return data.data;
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error, 'Failed to load ticket audit log'));
  }
});

/** Reply-to-customer composer path — separate thunk from addInternalNote,
 *  mirroring web's separate handleSendReply/handleAddNote so an agent can
 *  never accidentally wire the wrong endpoint to a shared handler. */
export const replyToTicket = createAsyncThunk<
  TicketRecord,
  { id: number | string; body: string },
  { rejectValue: string }
>('tickets/reply', async ({ id, body }, { rejectWithValue, dispatch }) => {
  try {
    await ticketsApi.addReply(id, body);
    // Refetch the full ticket so the new message + first_response_at land
    // through the same shape as the initial load, rather than hand-merging
    // a partial response.
    const { data } = await ticketsApi.getTicketById(id);
    return data.data;
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error, 'Failed to send reply'));
  } finally {
    dispatch(fetchTicketAuditLog(id));
  }
});

/** Internal-note composer path — agent-only; never call from a
 *  customer-facing screen (see TicketChatScreen's role gating). */
export const addInternalNoteToTicket = createAsyncThunk<
  TicketRecord,
  { id: number | string; body: string },
  { rejectValue: string }
>('tickets/addInternalNote', async ({ id, body }, { rejectWithValue }) => {
  try {
    await ticketsApi.addInternalNote(id, body);
    const { data } = await ticketsApi.getTicketById(id);
    return data.data;
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error, 'Failed to add internal note'));
  }
});

export const updateTicketStatusThunk = createAsyncThunk<
  TicketRecord,
  { id: number | string; status: TicketStatus },
  { rejectValue: string }
>('tickets/updateStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    await ticketsApi.updateTicketStatus(id, status);
    const { data } = await ticketsApi.getTicketById(id);
    return data.data;
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error, 'Failed to update ticket status'));
  }
});

export const updateTicketPriorityThunk = createAsyncThunk<
  TicketRecord,
  { id: number | string; priority: TicketPriority },
  { rejectValue: string }
>('tickets/updatePriority', async ({ id, priority }, { rejectWithValue }) => {
  try {
    await ticketsApi.updateTicketPriority(id, priority);
    const { data } = await ticketsApi.getTicketById(id);
    return data.data;
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error, 'Failed to update ticket priority'));
  }
});

export const assignTicketThunk = createAsyncThunk<
  TicketRecord,
  { id: number | string; assignedToUserId?: number | null; assignedRoleId?: number | null },
  { rejectValue: string }
>('tickets/assign', async ({ id, assignedToUserId, assignedRoleId }, { rejectWithValue }) => {
  try {
    await ticketsApi.assignTicket(id, { assignedToUserId, assignedRoleId });
    const { data } = await ticketsApi.getTicketById(id);
    return data.data;
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error, 'Failed to assign ticket'));
  }
});

/** POST /tickets — CUSTOMER-initiated ticket creation from RaiseTicketScreen.
 *  No customerId is ever passed here (see ticketsApi.raiseTicket's doc
 *  comment) — the mobile create form is CUSTOMER-only. Returns the newly
 *  created ticket (same shape as GET /tickets/:id) so the caller can
 *  navigate straight into TicketChatScreen using its id. */
export const raiseTicket = createAsyncThunk<
  TicketRecord,
  { subject: string; message: string; categoryId?: number },
  { rejectValue: string }
>('tickets/raise', async (input, { rejectWithValue }) => {
  try {
    const { data } = await ticketsApi.raiseTicket(input);
    return data.data;
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error, 'Failed to raise ticket'));
  }
});

export const closeTicketThunk = createAsyncThunk<
  TicketRecord,
  number | string,
  { rejectValue: string }
>('tickets/close', async (id, { rejectWithValue }) => {
  try {
    await ticketsApi.closeTicket(id);
    const { data } = await ticketsApi.getTicketById(id);
    return data.data;
  } catch (error) {
    return rejectWithValue(getApiErrorMessage(error, 'Failed to close ticket'));
  }
});

const ticketsSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    clearTicketDetail(state) {
      state.detail = null;
      state.detailError = null;
      state.auditLog = [];
      state.auditLogError = null;
    },
    clearTicketsError(state) {
      state.listError = null;
      state.detailError = null;
      state.replyError = null;
      state.raiseError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTicketList.pending, (state) => {
        state.listLoading = true;
        state.listError = null;
      })
      .addCase(fetchTicketList.fulfilled, (state, action: PayloadAction<{ count: number; rows: TicketRecord[] }>) => {
        state.listLoading = false;
        state.list = action.payload.rows;
        state.listCount = action.payload.count;
      })
      .addCase(fetchTicketList.rejected, (state, action) => {
        state.listLoading = false;
        state.listError = action.payload ?? 'Failed to load tickets';
      })

      .addCase(fetchTicketById.pending, (state) => {
        state.detailLoading = true;
        state.detailError = null;
      })
      .addCase(fetchTicketById.fulfilled, (state, action: PayloadAction<TicketRecord>) => {
        state.detailLoading = false;
        state.detail = action.payload;
      })
      .addCase(fetchTicketById.rejected, (state, action) => {
        state.detailLoading = false;
        state.detailError = action.payload ?? 'Failed to load ticket';
      })

      .addCase(fetchTicketAuditLog.pending, (state) => {
        state.auditLogLoading = true;
        state.auditLogError = null;
      })
      .addCase(fetchTicketAuditLog.fulfilled, (state, action: PayloadAction<TicketAuditLogRecord[]>) => {
        state.auditLogLoading = false;
        state.auditLog = action.payload;
      })
      .addCase(fetchTicketAuditLog.rejected, (state, action) => {
        state.auditLogLoading = false;
        state.auditLogError = action.payload ?? 'Failed to load ticket audit log';
      })

      .addCase(replyToTicket.pending, (state) => {
        state.replyLoading = true;
        state.replyError = null;
      })
      .addCase(replyToTicket.fulfilled, (state, action: PayloadAction<TicketRecord>) => {
        state.replyLoading = false;
        state.detail = action.payload;
      })
      .addCase(replyToTicket.rejected, (state, action) => {
        state.replyLoading = false;
        state.replyError = action.payload ?? 'Failed to send reply';
      })

      .addCase(addInternalNoteToTicket.fulfilled, (state, action: PayloadAction<TicketRecord>) => {
        state.detail = action.payload;
      })

      .addCase(updateTicketStatusThunk.fulfilled, (state, action: PayloadAction<TicketRecord>) => {
        state.detail = action.payload;
      })
      .addCase(updateTicketPriorityThunk.fulfilled, (state, action: PayloadAction<TicketRecord>) => {
        state.detail = action.payload;
      })
      .addCase(assignTicketThunk.fulfilled, (state, action: PayloadAction<TicketRecord>) => {
        state.detail = action.payload;
      })
      .addCase(closeTicketThunk.fulfilled, (state, action: PayloadAction<TicketRecord>) => {
        state.detail = action.payload;
      })

      .addCase(raiseTicket.pending, (state) => {
        state.raiseLoading = true;
        state.raiseError = null;
      })
      .addCase(raiseTicket.fulfilled, (state, action: PayloadAction<TicketRecord>) => {
        state.raiseLoading = false;
        // Seed detail with the freshly created ticket so TicketChatScreen
        // has something to render immediately on navigation, before its
        // own fetchTicketById resolves.
        state.detail = action.payload;
      })
      .addCase(raiseTicket.rejected, (state, action) => {
        state.raiseLoading = false;
        state.raiseError = action.payload ?? 'Failed to raise ticket';
      });
  },
});

export const { clearTicketDetail, clearTicketsError } = ticketsSlice.actions;
export default ticketsSlice.reducer;
