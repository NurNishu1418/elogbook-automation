import { Page } from 'playwright';
import { env } from '../utils/env';

export interface ApiResult<T = any> {
  status: number;
  body: T;
}

/**
 * All authenticated API calls run entirely inside the browser context via
 * page.evaluate: the Bearer token is read from localStorage and used
 * in-browser only. It is never returned to Node, logged, or persisted -
 * only the JSON response body crosses back out.
 */
export async function authGet<T = any>(page: Page, url: string): Promise<ApiResult<T>> {
  return page.evaluate(async (u: string) => {
    let authHeader: string | undefined;
    try {
      const raw = localStorage.getItem('bcps-auth-token-and-user');
      if (raw) {
        const parsed = JSON.parse(raw);
        const token = parsed?.token ?? parsed?.access_token ?? parsed?.authToken ?? parsed?.data?.token;
        if (token) authHeader = `Bearer ${token}`;
      }
    } catch {
      /* ignore */
    }
    const res = await fetch(u, {
      headers: { Accept: 'application/json', ...(authHeader ? { Authorization: authHeader } : {}) },
      credentials: 'include',
    });
    const status = res.status;
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }
    return { status, body };
  }, url) as Promise<ApiResult<T>>;
}

export interface LogEntryTarget {
  id: string;
  logbook_entry_setup_master_id: string;
  compitency_level: string | null;
  year: string | null;
  max_value: string | null;
  min_value: string | null;
}

export interface CompetencyGroupNode {
  particulars: string;
  id: string;
  particulary_type: number;
  course_type: string | null;
  sl_no: number | null;
  is_show_ind: number;
  competence_level_type: string | null;
  has_competence_levels: number;
  childs: CompetencyGroupNode[];
  log_entry_target: LogEntryTarget[];
}

export interface FormTreeNode {
  particulars: string;
  setup_logbook_master_id: string | null;
  logbook_entry_setup_master_id: string | null;
  id: string;
  particulary_type: number;
  course_type: string | null;
  sl_no: number | null;
  is_show_ind: number;
  has_competence_levels?: number;
  entry_setup_master: FormTreeNode[];
  competency_group?: CompetencyGroupNode[];
  log_entry_target?: LogEntryTarget[];
}

export interface DynamicFieldDef {
  id: string;
  logbook_entry_setup_master_id: string;
  column_name: string;
  details_text: string | null;
  column_value_type: string;
  required_ind: number;
  is_show: number;
  sl_no: number | null;
  options: { text?: string; value?: string; label?: string }[];
}

export async function fetchFormListTree(page: Page, typeIndex: number): Promise<FormTreeNode[] | null> {
  const url = `${env.baseUrl}/api/auth/elogbook-management/v1/get-form-list/${typeIndex}`;
  const r = await authGet<{ success: boolean; data: FormTreeNode[] }>(page, url);
  if (r.status !== 200 || !Array.isArray(r.body?.data)) return null;
  return r.body.data;
}

export async function fetchDynamicProperties(page: Page, particularId: string): Promise<DynamicFieldDef[] | null> {
  const url = `${env.baseUrl}/api/auth/elogbook-management/v1/dynamic-form-property-by-particular/${particularId}`;
  const r = await authGet<{ success: boolean; data: DynamicFieldDef[] }>(page, url);
  if (r.status !== 200 || !Array.isArray(r.body?.data)) return null;
  return r.body.data;
}

export async function fetchLookupData(page: Page, key: string): Promise<any | null> {
  const url = `${env.baseUrl}/api/auth/setup/v1/get-data/${key}`;
  const r = await authGet<{ success: boolean; data: any }>(page, url);
  if (r.status !== 200) return null;
  return r.body?.data ?? null;
}
