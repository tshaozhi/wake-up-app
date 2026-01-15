"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const QUOTES = [
  "每一个清晨，都是重新开始的机会。☀️",
  "自律的顶端是自由，早起的你是最棒的！🚀",
  "世界还没醒，你已经开始了，这就是领先。🏁"
];

export default function WakeUpPage() {
  const router = useRouter();
  const supabase = createClient();

  // 在 WakeUpPage 组件内修改
  const [displayQuote, setDisplayQuote] = useState("");

  useEffect(() => {
    // 只在客户端运行时随机选择一次
    setDisplayQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);
  
  const [view, setView] = useState<'home' | 'profile'>('home'); 
  const [user, setUser] = useState<any>(null);
  const [nickname, setNickname] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [status, setStatus] = useState("准备好开启新的一天了吗？");
  const [hasWoken, setHasWoken] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [range, setRange] = useState<'week' | 'month' | 'year'>('week');
  const [loading, setLoading] = useState(true);

  const getChinaDate = () => {
    return new Intl.DateTimeFormat('zh-Hans-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()).replace(/\//g, '-');
  };

  // 核心修复：支持 周/月/年 切换并保持时间线准确
  const fetchLogs = async (userId: string, currentRange: 'week' | 'month' | 'year') => {
    const dayCount = currentRange === 'week' ? 7 : currentRange === 'month' ? 30 : 90; // 年视图建议先取90天以保流畅
    
    // 1. 生成基准日期序列
    const baseDays = Array.from({ length: dayCount }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (dayCount - 1 - i));
      return d.toISOString().split('T')[0];
    });

    // 2. 获取数据库数据
    const { data: records } = await supabase
      .from('wake_up_logs')
      .select('wake_time, wake_date')
      .eq('user_id', userId)
      .gte('wake_date', baseDays[0])
      .lte('wake_date', baseDays[dayCount - 1])
      .order('wake_date', { ascending: true });

    if (records) {
      const formatted = baseDays.map(dateStr => {
        const record = records.find(r => r.wake_date === dateStr);
        const dateObj = new Date(dateStr);
        
        // 根据范围决定 X 轴标签
        let dayLabel = "";
        if (currentRange === 'week') {
          dayLabel = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(dateObj);
        } else {
          dayLabel = dateStr.slice(5); // 显示 MM-DD
        }

        if (record) {
          const utcDate = new Date(record.wake_time);
          const chinaTimeStr = utcDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
          const [h, m] = chinaTimeStr.split(' ')[1].split(':');
          const decimalTime = parseInt(h) + parseInt(m) / 60;
          
          return {
            day: dayLabel,
            date: dateStr,
            time: parseFloat(decimalTime.toFixed(2)),
            hasData: true
          };
        }
        return { day: dayLabel, date: dateStr, time: null, hasData: false };
      });

      setChartData(formatted);
      if (currentRange === 'week') {
        const today = getChinaDate();
        setHasWoken(records.some(l => l.wake_date === today));
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        const name = currentUser.user_metadata.full_name || "朋友";
        setNickname(name);
        setNewNickname(name);
        await fetchLogs(currentUser.id, range);
      } else {
        router.push('/login');
      }
      setLoading(false);
    };
    init();
  }, [range, view]);

  const updateNickname = async () => {
    if (!newNickname || newNickname === nickname) return;
    const { data } = await supabase.from('profiles').select('id').eq('nickname', newNickname).maybeSingle();
    if (data) return alert("昵称已存在");
    const { error: authError } = await supabase.auth.updateUser({ data: { full_name: newNickname } });
    const { error: profileError } = await supabase.from('profiles').update({ nickname: newNickname }).eq('id', user.id);
    if (!authError && !profileError) { setNickname(newNickname); alert("修改成功！"); }
  };

  const updatePassword = async () => {
    if (newPassword.length < 6) return alert("密码至少6位");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) alert(error.message); else alert("密码修改成功");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 font-medium italic">同步中...</div>;

  // --- 个人中心视图 ---
  if (view === 'profile') {
    return (
      <main className="min-h-screen bg-gray-50 p-4 pb-12">
        <div className="max-w-md mx-auto space-y-6">
          <button onClick={() => setView('home')} className="text-yellow-600 font-bold py-2 flex items-center gap-1 transition-all active:translate-x-[-4px]">← 返回打卡</button>
          
          <div className="bg-white rounded-[32px] p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-gray-800">设置</h2>
            <div className="space-y-3">
              <input value={newNickname} onChange={e => setNewNickname(e.target.value)} placeholder="新昵称" className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-yellow-400 text-sm" />
              <button onClick={updateNickname} className="w-full bg-yellow-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-yellow-100 transition-all active:scale-95">修改昵称</button>
              <input type="password" placeholder="新密码" onChange={e => setNewPassword(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-yellow-400 text-sm" />
              <button onClick={updatePassword} className="w-full bg-gray-800 text-white py-4 rounded-2xl font-black transition-all active:scale-95">重置密码</button>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-gray-800">趋势分析</h2>
              <div className="flex bg-gray-100 rounded-xl p-1">
                {(['week', 'month', 'year'] as const).map(r => (
                  <button key={r} onClick={() => setRange(r)} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${range === r ? 'bg-white shadow-sm text-yellow-600' : 'text-gray-400'}`}>
                    {r === 'week' ? '周' : r === 'month' ? '月' : '年'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="day" fontSize={9} tickLine={false} axisLine={false} tick={{fill: '#9ca3af', fontWeight: 600}} minTickGap={range === 'week' ? 0 : 20} />
                  <YAxis domain={[4, 12]} hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
                    formatter={(value: number) => {
                      if (!value) return ["--", "起床时间"];
                      const hours = Math.floor(value);
                      const minutes = Math.round((value - hours) * 60);
                      return [`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, "时间"];
                    }}
                  />
                  <Line connectNulls={false} type="monotone" dataKey="time" stroke="#f59e0b" strokeWidth={3} dot={range === 'week'} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="w-full py-4 text-red-400 font-bold text-xs uppercase tracking-widest">退出登录</button>
        </div>
      </main>
    );
  }

  // --- 首页视图 ---
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-black text-yellow-500 tracking-tighter">醒了么</h1>
          <button onClick={() => setView('profile')} className="mt-2 text-gray-400 font-bold hover:text-yellow-600 transition-all text-sm">
            你好，<span className="text-gray-900">{nickname}</span> 👋
          </button>
          <div className="h-12 flex items-center justify-center">
            <p className="text-orange-500 text-xs font-bold italic px-4">
              {hasWoken ? displayQuote : status}
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <button 
            onClick={async () => {
              if(!user) return router.push('/login');
              const { error } = await supabase.from('wake_up_logs').insert([{ user_id: user.id, wake_date: getChinaDate() }]);
              if (error) alert("今日已打卡");
              else { setHasWoken(true); fetchLogs(user.id, range); }
            }}
            disabled={hasWoken}
            className={`w-44 h-44 rounded-full font-black text-2xl transition-all shadow-2xl active:scale-90 ${hasWoken ? "bg-white text-green-500 border-8 border-green-50" : "bg-gradient-to-tr from-yellow-400 to-orange-500 text-white"}`}
          >
            {hasWoken ? "今天已打卡" : "我醒了"}
          </button>
        </div>

        <div className="pt-8 border-t border-gray-50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">最近 7 天趋势</h3>
            <span className="text-[10px] font-bold text-yellow-500 bg-yellow-50 px-2 py-1 rounded-md">北京时间</span>
          </div>
          <div className="h-44 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.slice(-7)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f9f9f9" />
                  <XAxis dataKey="day" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontWeight: 700}} />
                  <YAxis domain={[4, 12]} hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}
                    formatter={(value: number) => {
                      if (!value) return ["--", "起床时间"];
                      const hours = Math.floor(value);
                      const minutes = Math.round((value - hours) * 60);
                      return [`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`, "时间"];
                    }}
                  />
                  <Line connectNulls={false} type="monotone" dataKey="time" stroke="#f59e0b" strokeWidth={5} dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (!payload.hasData) return null;
                    return <circle cx={cx} cy={cy} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={2} />;
                  }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300 text-xs font-bold italic">同步数据中...</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}