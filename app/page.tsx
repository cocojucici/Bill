'use client';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowDownRight,
  ArrowRightLeft,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  LogOut,
  Mail,
  Pencil,
  Plus,
  Trash2,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Currency = 'CNY' | 'HKD';
type Responsibility = 'shared' | 'other';
type Member = {
  household_id: string;
  user_id: string;
  display_name: string;
  joined_at: string;
};
type Expense = {
  id: string;
  household_id: string;
  paid_by: string;
  title: string;
  amount: number;
  currency: Currency;
  responsibility: Responsibility;
  created_at: string;
};
type Household = { id: string; name: string; invite_code: string };
type Notice = {
  id: string;
  household_id: string;
  month: string;
  debtor_id: string;
  creditor_id: string;
  cny_amount: number;
  hkd_amount: number;
  created_at: string;
  settled_at: string | null;
};
const money = (n: number, c: Currency) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: c,
    minimumFractionDigits: 2,
  }).format(n);
const monthKey = () => new Date().toISOString().slice(0, 7);
const FIRST_MONTH = '2026-09';
const monthLabel = (month: string) => `${Number(month.slice(5, 7))}月`;
const shiftMonth = (month: string, amount: number) => {
  const [year, value] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, value - 1 + amount, 1));
  return date.toISOString().slice(0, 7);
};

function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [hasInvite, setHasInvite] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/ledger`,
        shouldCreateUser: mode === 'register',
        ...(mode === 'register'
          ? {
              data: {
                ledger_registration: true,
                display_name: nickname.trim(),
                invite_code: hasInvite ? inviteCode.trim().toUpperCase() : '',
              },
            }
          : {}),
      },
    });
    setBusy(false);
    if (error)
      setError(
        mode === 'login'
          ? '登录错误'
          : error.message,
      );
    else {
      if (mode === 'register') {
        localStorage.setItem(
          'pending-ledger-registration',
          JSON.stringify({
            nickname: nickname.trim(),
            inviteCode: hasInvite ? inviteCode.trim().toUpperCase() : '',
          }),
        );
      } else {
        localStorage.removeItem('pending-ledger-registration');
      }
      setSent(true);
    }
  }
  return (
    <main className="auth-page">
      <div className="auth-card">
        <span className="brand-mark">
          <WalletCards size={22} />
        </span>
        <p className="eyebrow">合租共同账本</p>
        <h1>{sent ? '登录链接已发送' : mode === 'login' ? '登录账本' : '注册账号'}</h1>
        <p>
          {sent
            ? '请至注册邮箱查看你的账本链接，该链接永久有效，请通过链接登录你的账号查看账本。'
            : mode === 'login'
              ? '使用已注册邮箱登录对应账本'
              : '验证邮箱后，可创建新账本或使用邀请码加入室友账本'}
        </p>
        {sent ? (
          <button className="text-button" onClick={() => setSent(false)}>
            更换邮箱或重新发送
          </button>
        ) : (
          <>
            <div className="mode-tabs auth-mode-tabs">
              <button
                type="button"
                className={mode === 'register' ? 'active' : ''}
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
              >
                新用户注册
              </button>
              <button
                type="button"
                className={mode === 'login' ? 'active' : ''}
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
              >
                已有账号登录
              </button>
            </div>
            <form onSubmit={submit}>
            {mode === 'register' && (
              <>
                <div className="invite-choice" role="group" aria-label="是否有邀请码">
                  <button
                    type="button"
                    className={hasInvite ? 'active' : ''}
                    onClick={() => setHasInvite(true)}
                  >
                    我有邀请码
                  </button>
                  <button
                    type="button"
                    className={!hasInvite ? 'active' : ''}
                    onClick={() => setHasInvite(false)}
                  >
                    我没有邀请码
                  </button>
                </div>
                {hasInvite && (
                  <label>
                    <span>邀请码</span>
                    <input
                      className="code-input"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      maxLength={8}
                      placeholder="输入 8 位邀请码"
                      required
                    />
                  </label>
                )}
                <label>
                  <span>你的姓名</span>
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="输入你的姓名"
                    required
                  />
                </label>
              </>
            )}
            <label>
              <span>邮箱地址</span>
              <div className="email-input">
                <Mail size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
            </label>
            {error && <div className="form-error">{error}</div>}
            <button className="auth-submit" disabled={busy}>
              {busy
                ? '正在发送…'
                : mode === 'login'
                  ? '发送登录链接'
                  : '发送注册链接'}
            </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

function Setup({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [home, setHome] = useState('我们的家');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const result =
      mode === 'create'
        ? await supabase.rpc('create_household', {
            p_name: home,
            p_display_name: name,
          })
        : await supabase.rpc('join_household', {
            p_invite_code: code,
            p_display_name: name,
          });
    setBusy(false);
    if (result.error) setError(result.error.message);
    else onDone();
  }
  return (
    <main className="auth-page">
      <div className="auth-card setup-card">
        <span className="brand-mark">
          <Users size={22} />
        </span>
        <p className="eyebrow">开始共同记账</p>
        <h1>{mode === 'create' ? '创建合租账本' : '加入室友的账本'}</h1>
        <div className="mode-tabs">
          <button
            className={mode === 'create' ? 'active' : ''}
            onClick={() => setMode('create')}
          >
            创建账本
          </button>
          <button
            className={mode === 'join' ? 'active' : ''}
            onClick={() => setMode('join')}
          >
            输入邀请码
          </button>
        </div>
        <form onSubmit={submit}>
          <label>
            <span>你的名字</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="室友怎么你？"
              required
            />
          </label>
          {mode === 'create' ? (
            <label>
              <span>账本名称</span>
              <input
                value={home}
                onChange={(e) => setHome(e.target.value)}
                required
              />
            </label>
          ) : (
            <label>
              <span>8 位邀请码</span>
              <input
                className="code-input"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={8}
                placeholder="AB12CD34"
                required
              />
            </label>
          )}
          {error && <div className="form-error">{error}</div>}
          <button className="auth-submit" disabled={busy}>
            {busy ? '正在处理…' : mode === 'create' ? '创建并继续' : '加入账本'}
          </button>
        </form>
      </div>
    </main>
  );
}

function PersonLedger({
  member,
  accent,
  expenses,
  selectedMonth,
  notice,
  onSettleNotice,
  canEditName,
  onRename,
  onAdd,
  onDelete,
}: {
  member: Member;
  accent: 'coral' | 'teal';
  expenses: Expense[];
  selectedMonth: string;
  notice?: Notice;
  onSettleNotice: (notice: Notice) => Promise<void>;
  canEditName: boolean;
  onRename: (name: string) => Promise<boolean>;
  onAdd: (
    e: Omit<Expense, 'id' | 'household_id' | 'paid_by' | 'created_at'>,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('CNY');
  const [responsibility, setResponsibility] =
    useState<Responsibility>('shared');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(member.display_name);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState('');
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  const monthly = expenses.filter(
    (e) => e.created_at.slice(0, 7) === selectedMonth,
  );
  const totals = {
    CNY: monthly
      .filter((e) => e.currency === 'CNY')
      .reduce((s, e) => s + Number(e.amount), 0),
    HKD: monthly
      .filter((e) => e.currency === 'HKD')
      .reduce((s, e) => s + Number(e.amount), 0),
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!title.trim() || value <= 0) return;
    setBusy(true);
    await onAdd({
      title: title.trim(),
      amount: value,
      currency,
      responsibility,
    });
    setBusy(false);
    setTitle('');
    setAmount('');
    setResponsibility('shared');
    setOpen(false);
  }
  return (
    <section className={`ledger ledger-${accent}`}>
      <div className="person-head">
        <div className="avatar">{member.display_name.slice(0, 1)}</div>
        <div className="person-name-wrap">
          <span>记账人</span>
          <div className="name-field">
            <strong>{member.display_name}</strong>
            {canEditName && (
              <button
                type="button"
                onClick={() => {
                  setNameDraft(member.display_name);
                  setNameError('');
                  setRenaming(true);
                }}
                aria-label="修改姓名"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
        </div>
        {!open && (
          <button className="head-expense-button" onClick={() => setOpen(true)}>
            <Plus size={17} />
            <span>记一笔支出</span>
          </button>
        )}
      </div>
      {notice && !notice.settled_at && (
        <div className="debt-notice">
          <Bell size={18} />
          <div>
            <strong>{monthLabel(notice.month)}待结清</strong>
            <span>
              {notice.cny_amount > 0 && money(Number(notice.cny_amount), 'CNY')}
              {notice.cny_amount > 0 && notice.hkd_amount > 0 && ' · '}
              {notice.hkd_amount > 0 && money(Number(notice.hkd_amount), 'HKD')}
            </span>
          </div>
          <button onClick={() => onSettleNotice(notice)}>已缴纳</button>
        </div>
      )}
      <div className="summary-row">
        <div>
          <small>本月人民币支出</small>
          <strong>{money(totals.CNY, 'CNY')}</strong>
        </div>
        <div>
          <small>本月港币支出</small>
          <strong>{money(totals.HKD, 'HKD')}</strong>
        </div>
      </div>
      <div className="history-head">
        <div>
          <strong>{monthLabel(selectedMonth)}支出</strong>
          <span>{monthly.length} 笔记录</span>
        </div>
        <ArrowDownRight size={20} />
      </div>
      <div className="expense-list">
        {monthly.length === 0 ? (
          <div className="empty">
            <WalletCards size={25} />
            <p>本月还没有支出</p>
            <span>点击“记一笔支出”开始记账</span>
          </div>
        ) : (
          monthly.map((x) => (
            <article className="expense-item" key={x.id}>
              <div className="expense-icon">{x.title.slice(0, 1)}</div>
              <div className="expense-copy">
                <strong>{x.title}</strong>
                <span>
                  {x.currency === 'CNY' ? '人民币' : '港币'} ·{' '}
                  {x.responsibility === 'other' ? '对方承担' : '共同支出'}
                </span>
              </div>
              <b>{money(Number(x.amount), x.currency)}</b>
              <button
                onClick={() => {
                  if (window.confirm(`确定要删除“${x.title}”这笔支出吗？`))
                    onDelete(x.id);
                }}
                aria-label={`删除${x.title}`}
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))
        )}
      </div>
      {open && (
        <div
          className="expense-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <form
            className={`expense-form expense-modal expense-modal-${accent}`}
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            aria-label={`为${member.display_name}记一笔支出`}
          >
          <div className="form-title">
            <span className="round-plus">
              <Plus size={16} />
            </span>
            <strong>记一笔支出</strong>
            <button
              type="button"
              className="close-form"
              onClick={() => setOpen(false)}
            >
              <X size={17} />
            </button>
          </div>
          <label>
            <span>支出项目</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：房租、水电、日用品"
              required
            />
          </label>
          <div className="amount-line">
            <label>
              <span>金额</span>
              <input
                type="number"
                min=".01"
                step=".01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </label>
            <label>
              <span>币种</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                <option value="CNY">人民币 ¥</option>
                <option value="HKD">港币 HK$</option>
              </select>
            </label>
          </div>
          <label>
            <span>费用归属</span>
            <select
              value={responsibility}
              onChange={(e) =>
                setResponsibility(e.target.value as Responsibility)
              }
            >
              <option value="shared">共同支出（AA）</option>
              <option value="other">对方承担</option>
            </select>
          </label>
          <button className="add-button" disabled={busy}>
            {busy ? '正在保存…' : '添加支出'}
          </button>
          </form>
        </div>
      )}
      {renaming && (
        <div className="name-dialog-backdrop" role="presentation">
          <form
            className="name-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`rename-${member.user_id}`}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!nameDraft.trim()) return;
              setNameBusy(true);
              const saved = await onRename(nameDraft.trim());
              setNameBusy(false);
              if (saved) setRenaming(false);
              else setNameError('姓名保存失败，请稍后重试。');
            }}
          >
            <div className="name-dialog-head">
              <strong id={`rename-${member.user_id}`}>修改记账人姓名</strong>
              <button type="button" onClick={() => setRenaming(false)} aria-label="关闭">
                <X size={17} />
              </button>
            </div>
            <label>
              <span>姓名</span>
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={24}
                placeholder="输入你的姓名"
                required
              />
            </label>
            {nameError && <div className="form-error">{nameError}</div>}
            <button className="auth-submit" disabled={nameBusy}>
              {nameBusy ? '正在保存…' : '保存姓名'}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(monthKey());
  const [showSettlement, setShowSettlement] = useState(false);
  const [publishingSettlement, setPublishingSettlement] = useState(false);
  const load = useCallback(async () => {
    let { data: member } = await supabase
      .from('household_members')
      .select('household_id,user_id,display_name,joined_at')
      .maybeSingle();
    const pendingRegistration = localStorage.getItem(
      'pending-ledger-registration',
    );
    const { data: userResult } = await supabase.auth.getUser();
    const metadata = userResult.user?.user_metadata as
      | { ledger_registration?: boolean; display_name?: string; invite_code?: string }
      | undefined;
    const registrationFromAuth = metadata?.ledger_registration
      ? JSON.stringify({
          nickname: metadata.display_name,
          inviteCode: metadata.invite_code,
        })
      : null;
    const registrationData = pendingRegistration || registrationFromAuth;
    if (member && registrationData) {
      localStorage.removeItem('pending-ledger-registration');
    }
    if (!member && registrationData) {
      try {
        const intent = JSON.parse(registrationData) as {
          nickname?: string;
          inviteCode?: string;
        };
        const nickname = intent.nickname?.trim() || '室友';
        const result = intent.inviteCode
          ? await supabase.rpc('join_household', {
              p_invite_code: intent.inviteCode,
              p_display_name: nickname,
            })
          : await supabase.rpc('create_household', {
              p_name: `${nickname}的合租账本`,
              p_display_name: nickname,
            });
        if (!result.error) {
          localStorage.removeItem('pending-ledger-registration');
          const refreshed = await supabase
            .from('household_members')
            .select('household_id,user_id,display_name,joined_at')
            .maybeSingle();
          member = refreshed.data;
        }
      } catch {
        localStorage.removeItem('pending-ledger-registration');
      }
    }
    if (!member) {
      setHousehold(null);
      setMembers([]);
      setExpenses([]);
      setNotices([]);
      setLoading(false);
      return;
    }
    const [{ data: home }, { data: people }, { data: items }, { data: alerts }] =
      await Promise.all([
        supabase
          .from('households')
          .select('id,name,invite_code')
          .eq('id', member.household_id)
          .single(),
        supabase
          .from('household_members')
          .select('*')
          .eq('household_id', member.household_id)
          .order('joined_at'),
        supabase
          .from('expenses')
          .select('*')
          .eq('household_id', member.household_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('settlement_notices')
          .select('*')
          .eq('household_id', member.household_id)
          .order('created_at', { ascending: false }),
      ]);
    setHousehold(home);
    setMembers(people || []);
    setExpenses((items || []) as Expense[]);
    setNotices((alerts || []) as Notice[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) load();
      else setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) load();
      else {
        setHousehold(null);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [load]);
  useEffect(() => {
    if (!household) return;
    const channel = supabase
      .channel(`expenses-${household.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `household_id=eq.${household.id}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [household, load]);
  if (loading)
    return (
      <main className="loading-page">
        <WalletCards size={30} />
        <span>正在打开账本…</span>
      </main>
    );
  if (!session) return <Login />;
  if (!household) return <Setup onDone={load} />;
  const add = async (
    member: Member,
    e: Omit<Expense, 'id' | 'household_id' | 'paid_by' | 'created_at'>,
  ) => {
    await supabase
      .from('expenses')
      .insert({
        ...e,
        household_id: household.id,
        paid_by: member.user_id,
        created_at:
          selectedMonth === monthKey()
            ? new Date().toISOString()
            : `${selectedMonth}-01T12:00:00.000Z`,
      });
    await load();
  };
  const remove = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id);
    await load();
  };
  const renameMember = async (member: Member, name: string) => {
    const { error } = await supabase
      .from('household_members')
      .update({ display_name: name })
      .eq('user_id', member.user_id);
    if (error) return false;
    await load();
    return true;
  };
  const filled = [...members];
  const hasTwoMembers = members.length >= 2;
  if (filled.length === 1)
    filled.push({
      household_id: household.id,
      user_id: 'pending',
      display_name: '等待室友加入',
      joined_at: '',
    });
  const settlement = (['CNY', 'HKD'] as Currency[]).map((currency) => {
    const valid = (id: string) =>
      expenses.filter(
        (e) =>
          e.created_at.slice(0, 7) === selectedMonth &&
          e.currency === currency &&
          e.paid_by === id,
      );
    const a = valid(filled[0].user_id).reduce(
        (s, e) =>
          s + Number(e.amount) * (e.responsibility === 'other' ? 1 : 0.5),
        0,
      ),
      b = valid(filled[1].user_id).reduce(
        (s, e) =>
          s + Number(e.amount) * (e.responsibility === 'other' ? 1 : 0.5),
        0,
      ),
      balance = a - b;
    return {
      currency,
      amount: Math.abs(balance),
      payer: balance > 0 ? filled[1] : filled[0],
      receiver: balance > 0 ? filled[0] : filled[1],
    };
  });
  const settlementGroups = filled
    .map((debtor) => {
      const rows = settlement.filter(
        (item) => item.payer.user_id === debtor.user_id && item.amount >= 0.005,
      );
      return {
        debtor,
        creditor: rows[0]?.receiver,
        rows,
      };
    })
    .filter(
      (group) =>
        group.rows.length > 0 &&
        group.creditor &&
        group.debtor.user_id !== 'pending' &&
        group.creditor.user_id !== 'pending',
    );
  const publishSettlement = async () => {
    if (!settlementGroups.length) return;
    setPublishingSettlement(true);
    await supabase.from('settlement_notices').upsert(
      settlementGroups.map((group) => ({
        household_id: household.id,
        month: selectedMonth,
        debtor_id: group.debtor.user_id,
        creditor_id: group.creditor!.user_id,
        cny_amount:
          group.rows.find((row) => row.currency === 'CNY')?.amount || 0,
        hkd_amount:
          group.rows.find((row) => row.currency === 'HKD')?.amount || 0,
        created_by: session.user.id,
        settled_at: null,
      })),
      { onConflict: 'household_id,month,debtor_id,creditor_id' },
    );
    await load();
    setPublishingSettlement(false);
    setShowSettlement(false);
  };
  const settleNotice = async (notice: Notice) => {
    if (!window.confirm('确定这笔欠款已经全部缴清吗？确认后欠款提醒将消失。'))
      return;
    await supabase
      .from('settlement_notices')
      .update({ settled_at: new Date().toISOString() })
      .eq('id', notice.id);
    await load();
  };
  const monthNotices = notices.filter((notice) => notice.month === selectedMonth);
  const monthSettled =
    monthNotices.length > 0 && monthNotices.every((notice) => notice.settled_at);
  return (
    <main>
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">
            <WalletCards size={20} />
          </span>
          <div>
            <h1>{household.name}</h1>
            <p>两个人的共同生活开销</p>
          </div>
        </div>
        <div className="account-area">
          <div className="invite-chip">
            <span>邀请码</span>
            <b>{household.invite_code}</b>
            <button
              onClick={() =>
                navigator.clipboard.writeText(household.invite_code)
              }
            >
              <Copy size={14} />
            </button>
          </div>
          <button className="logout" onClick={() => supabase.auth.signOut()}>
            <LogOut size={17} />
            <span>退出</span>
          </button>
        </div>
      </header>
      <nav className="month-nav" aria-label="账本月份">
        <button
          onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
          disabled={selectedMonth <= FIRST_MONTH}
          aria-label="查看上一个月"
        >
          <ChevronLeft size={19} />
        </button>
        <div>
          <strong>
            {monthLabel(selectedMonth)}
            {monthSettled && <em>当月已清账</em>}
          </strong>
          <span>{selectedMonth.slice(0, 4)} 年账本</span>
        </div>
        <button
          onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
          disabled={selectedMonth >= monthKey()}
          aria-label="查看下一个月"
        >
          <ChevronRight size={19} />
        </button>
      </nav>
      <div className="ledger-grid">
        {filled.slice(0, 2).map((member, i) => (
          <PersonLedger
            key={member.user_id}
            member={member}
            accent={i === 0 ? 'coral' : 'teal'}
            expenses={expenses.filter((e) => e.paid_by === member.user_id)}
            selectedMonth={selectedMonth}
            notice={notices.find(
              (notice) =>
                notice.month === selectedMonth &&
                notice.debtor_id === member.user_id,
            )}
            onSettleNotice={settleNotice}
            canEditName={member.user_id === session.user.id}
            onRename={(name) => renameMember(member, name)}
            onAdd={(e) => add(member, e)}
            onDelete={remove}
          />
        ))}
      </div>
      <section className="settlement-section">
        {showSettlement && (
          <div className="settlement-result">
            <div className="result-title">
              <CheckCircle2 size={21} />
              <div>
                <strong>本月待清算账单</strong>
                <span>以下金额是本月结算后实际需要支付的欠款</span>
              </div>
              <button onClick={() => setShowSettlement(false)}>
                <X size={17} />
              </button>
            </div>
            {!hasTwoMembers ? (
              <div className="settled-empty">室友加入账本后即可结算</div>
            ) : settlementGroups.length === 0 ? (
              <div className="settled-empty">
                <CheckCircle2 size={18} /> 本月双方无需互相付款
              </div>
            ) : (
              <div className="settlement-groups">
                {settlementGroups.map((group) => (
                  <section className="debtor-card" key={group.debtor.user_id}>
                    <header>
                      <strong>
                        {group.debtor.display_name} 应该给{' '}
                        {group.creditor!.display_name}
                      </strong>
                      <span>本月应付欠款</span>
                    </header>
                    <table>
                      <tbody>
                        {group.rows.map((row) => (
                          <tr key={row.currency}>
                            <td>{row.currency === 'CNY' ? '人民币' : '港币'}</td>
                            <td>{money(row.amount, row.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                ))}
              </div>
            )}
            <p>人民币和港币分别结算，不进行汇率换算。</p>
            {settlementGroups.length > 0 && (
              <button
                className="publish-settlement"
                onClick={publishSettlement}
                disabled={publishingSettlement}
              >
                {publishingSettlement ? '正在发布…' : '发布账单'}
              </button>
            )}
          </div>
        )}
        <div className="settlement-heading">
          <button onClick={() => setShowSettlement(true)}>
            <ArrowRightLeft size={18} />
            开始结算
          </button>
        </div>
      </section>
    </main>
  );
}
