import { supabase } from './supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type ChangeEvent = {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
  timestamp: Date;
};

type Listener = (event: ChangeEvent) => void;

class RealtimeStore {
  private channel: RealtimeChannel | null = null;
  private listeners: Set<Listener> = new Set();
  private connected = false;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (!this.channel) this.connect();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.disconnect();
    };
  }

  private connect() {
    if (this.channel) return;

    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key || url.includes('placeholder')) {
      console.warn('[realtime] Supabase not configured, skipping subscription');
      return;
    }

    this.channel = supabase
      .channel('digiai_app_ops')
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'ops', table: 'roadmap_tasks' },
        (payload: RealtimePostgresChangesPayload<any>) => this.handle('roadmap_tasks', payload)
      )
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'ops', table: 'roadmap_phases' },
        (payload: RealtimePostgresChangesPayload<any>) => this.handle('roadmap_phases', payload)
      )
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'ops', table: 'decisions' },
        (payload: RealtimePostgresChangesPayload<any>) => this.handle('decisions', payload)
      )
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'ops', table: 'backlog_items' },
        (payload: RealtimePostgresChangesPayload<any>) => this.handle('backlog_items', payload)
      )
      .subscribe((status) => {
        this.connected = status === 'SUBSCRIBED';
        if (status === 'SUBSCRIBED') {
          console.log('[realtime] Connected');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime] Channel error');
        }
      });
  }

  private disconnect() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
      this.connected = false;
    }
  }

  private handle(table: string, payload: RealtimePostgresChangesPayload<any>) {
    const event: ChangeEvent = {
      table,
      eventType: payload.eventType as any,
      new: payload.new,
      old: payload.old,
      timestamp: new Date(),
    };
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[realtime] listener error', err);
      }
    }
  }

  isConnected() {
    return this.connected;
  }
}

export const realtimeStore = new RealtimeStore();
