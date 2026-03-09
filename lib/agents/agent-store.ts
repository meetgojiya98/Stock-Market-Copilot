"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AgentId, AgentInstance, AgentRunResult, AgentSignal, AgentState } from "./types";

const STORAGE_KEY = "zentrade_agents_v1";

function load(): AgentState {
  if (typeof window === "undefined") return { instances: [], signals: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { instances: [], signals: [] };
}

function save(state: AgentState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

type AgentContextValue = {
  instances: AgentInstance[];
  signals: AgentSignal[];
  deploy: (configId: AgentId, symbols: string[]) => AgentInstance;
  remove: (id: string) => void;
  updateInstance: (id: string, patch: Partial<AgentInstance>) => void;
  addSignals: (signals: AgentSignal[]) => void;
  clearSignals: () => void;
  clearAll: () => void;
  getInstancesForConfig: (configId: AgentId) => AgentInstance[];
};

export const AgentContext = createContext<AgentContextValue>({
  instances: [],
  signals: [],
  deploy: () => ({ id: "", configId: "market-scanner", status: "idle", symbols: [], lastRun: null, lastResult: null, enabled: true, createdAt: "" }),
  remove: () => {},
  updateInstance: () => {},
  addSignals: () => {},
  clearSignals: () => {},
  clearAll: () => {},
  getInstancesForConfig: () => [],
});

export function useAgents() {
  return useContext(AgentContext);
}

export function useAgentProvider() {
  const [state, setState] = useState<AgentState>({ instances: [], signals: [] });

  useEffect(() => {
    setState(load());
  }, []);

  const persistUpdate = useCallback((updater: (prev: AgentState) => AgentState) => {
    setState((prev) => {
      const next = updater(prev);
      save(next);
      return next;
    });
  }, []);

  const deploy = useCallback((configId: AgentId, symbols: string[]): AgentInstance => {
    const instance: AgentInstance = {
      id: crypto.randomUUID(),
      configId,
      status: "idle",
      symbols,
      lastRun: null,
      lastResult: null,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    persistUpdate((prev) => ({ ...prev, instances: [...prev.instances, instance] }));
    return instance;
  }, [persistUpdate]);

  const remove = useCallback((id: string) => {
    persistUpdate((prev) => ({ ...prev, instances: prev.instances.filter((i) => i.id !== id) }));
  }, [persistUpdate]);

  const updateInstance = useCallback((id: string, patch: Partial<AgentInstance>) => {
    persistUpdate((prev) => ({
      ...prev,
      instances: prev.instances.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  }, [persistUpdate]);

  const addSignals = useCallback((newSignals: AgentSignal[]) => {
    persistUpdate((prev) => ({ ...prev, signals: [...newSignals, ...prev.signals].slice(0, 100) }));
  }, [persistUpdate]);

  const clearSignals = useCallback(() => {
    persistUpdate((prev) => ({ ...prev, signals: [] }));
  }, [persistUpdate]);

  const clearAll = useCallback(() => {
    persistUpdate(() => ({ instances: [], signals: [] }));
  }, [persistUpdate]);

  const getInstancesForConfig = useCallback((configId: AgentId) => {
    return state.instances.filter((i) => i.configId === configId);
  }, [state]);

  return {
    instances: state.instances,
    signals: state.signals,
    deploy,
    remove,
    updateInstance,
    addSignals,
    clearSignals,
    clearAll,
    getInstancesForConfig,
  };
}
