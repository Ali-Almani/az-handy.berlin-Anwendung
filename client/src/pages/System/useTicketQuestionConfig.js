import { useEffect, useRef, useState } from 'react';
import {
  getTicketQuestionConfigApi,
  saveTicketQuestionConfigApi
} from '../../services/whatsapp.service';
import { getSocket } from '../../services/socket';
import {
  hasQuestionConfigContent,
  loadQuestionConfig,
  normalizeQuestionConfig,
  saveQuestionConfig
} from './callcenterLeadData';

function applyConfig(raw, setConfig, lastSent) {
  const next = normalizeQuestionConfig(raw);
  saveQuestionConfig(next);
  lastSent.current = JSON.stringify(next);
  setConfig(next);
  return next;
}

export function useTicketQuestionConfig({ persist = false } = {}) {
  const [config, setConfig] = useState(() => loadQuestionConfig());
  const skipPersist = useRef(true);
  const lastSent = useRef(JSON.stringify(loadQuestionConfig()));

  useEffect(() => {
    let on = true;
    skipPersist.current = true;
    getTicketQuestionConfigApi()
      .then((res) => {
        if (!on) return;
        const remote = res?.config;
        if (res?.empty) {
          const local = loadQuestionConfig();
          if (persist && hasQuestionConfigContent(local)) {
            return saveTicketQuestionConfigApi(local).then((saved) => {
              if (!on) return;
              applyConfig(saved?.config || local, setConfig, lastSent);
            });
          }
          return;
        }
        if (remote) applyConfig(remote, setConfig, lastSent);
      })
      .catch(() => {})
      .finally(() => {
        if (!on) return;
        window.setTimeout(() => {
          if (on) skipPersist.current = false;
        }, 80);
      });

    const socket = getSocket();
    const onUpdate = (payload) => {
      if (!payload?.config) return;
      skipPersist.current = true;
      applyConfig(payload.config, setConfig, lastSent);
      window.setTimeout(() => {
        skipPersist.current = false;
      }, 80);
    };
    socket?.on?.('ticketing:ticket-fields', onUpdate);
    return () => {
      on = false;
      socket?.off?.('ticketing:ticket-fields', onUpdate);
    };
  }, [persist]);

  useEffect(() => {
    saveQuestionConfig(config);
    if (skipPersist.current || !persist) return undefined;
    const encoded = JSON.stringify(config);
    if (encoded === lastSent.current) return undefined;
    const timer = window.setTimeout(() => {
      lastSent.current = encoded;
      saveTicketQuestionConfigApi(config).catch(() => {});
    }, 500);
    return () => window.clearTimeout(timer);
  }, [config, persist]);

  return [config, setConfig];
}
