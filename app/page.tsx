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
  
  // 基础状态
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

  // 辅助函数：获取中国当前日期
  const getChinaDate = () => {
    return new Intl.DateTimeFormat('zh-Hans-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()).replace(/\//g, '-');
  };

  // 核心数据加载逻辑
  const fetchLogs = async (userId: string) => {
    const days = range === 'week' ? 7 : range === 'month' ? 30 : 365;
    const { data } = await supabase
      .from('wake_up_logs')
      .select('wake_time, wake_date')
      .eq('user_id', userId)
      .order('wake_date', { ascending: false })
      .limit(days);

    if (data) {
      const formatted = data.map(log => {
        const utcDate = new Date(log.wake_time);
        const chinaTimeStr = utcDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
        const timeParts = chinaTimeStr.split(' ')[1].split(':');
        const hour = parseInt(timeParts[0]);
        const minute = parseInt(timeParts[1]);
        
        return {
          day: new Date(log.wake_date).toLocaleDateString('zh-CN', { weekday: 'short' }),
          date: log.wake_date.slice(5),
          time: parseFloat((hour + minute / 60).toFixed(2))
        };
      }).reverse();

      setChartData(formatted);
      const today = getChinaDate();
      setHasWoken(data.some(l => l.wake_date === today));
    }
  };

  // 统一的 useEffect：解决 Render Error
  useEffect(() => {
    const init = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        const name = currentUser.user_metadata.full_name || "朋友";
        setNickname(name);
        setNewNickname(name);
        await fetchLogs(currentUser.id);
      }
      setLoading(false);
    };
    init();
  }, [range, view]); // 依赖数组在渲染间保持稳定

  const updateNickname = async () => {
    if (!newNickname || newNickname === nickname) return;
    
    // 1. 先查重
    const { data } = await supabase.from('profiles').select('id').eq('nickname', newNickname).single();
    if (data) return alert("昵称已存在");

    // 2. 更新 auth 元数据和 profiles 表
    const { error: authError } = await supabase.auth.updateUser({ data: { full_name: newNickname } });
    const { error: profileError } = await supabase.from('profiles').update({ nickname: newNickname }).eq('id', user.id);

    if (!authError && !profileError) {
      setNickname(newNickname);
      alert("修改成功！");
    } else {
      alert("更新失败，请稍后再试");
    }
  };
  const updatePassword = async () => {
    if (newPassword.length < 6) return alert("密码至少6位");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) alert(error.message);
    else alert("密码修改成功");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 font-medium">加载中...</div>;

  // --- 个人中心视图 ---
  if (view === 'profile') {
    return (
      <main className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto space-y-6">
          <button onClick={() => setView('home')} className="text-yellow-600 font-bold py-2 flex items-center gap-1">← 返回打卡</button>
          
          <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-gray-800">账号设置</h2>
            <div className="space-y-3">
              <input value={newNickname} onChange={e => setNewNickname(e.target.value)} placeholder="新昵称" className="w-full bg-gray-50 p-3 rounded-xl border-none outline-yellow-400" />
              <button onClick={updateNickname} className="w-full bg-yellow-500 text-white py-3 rounded-xl font-bold">修改昵称</button>
              <input type="password" placeholder="新密码" onChange={e => setNewPassword(e.target.value)} className="w-full bg-gray-50 p-3 rounded-xl border-none outline-yellow-400" />
              <button onClick={updatePassword} className="w-full bg-gray-800 text-white py-3 rounded-xl font-bold">重置密码</button>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-gray-800">历史趋势</h2>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(['week', 'month', 'year'] as const).map(r => (
                  <button key={r} onClick={() => setRange(r)} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${range === r ? 'bg-white shadow-sm text-yellow-600' : 'text-gray-400'}`}>
                    {r === 'week' ? '周' : r === 'month' ? '月' : '年'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey={range === 'year' ? 'date' : 'day'} fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis domain={[4, 12]} hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' }}
                    formatter={(val: any) => [`${val} 点`, '起床时间']}
                  />
                  <Line type="monotone" dataKey="time" stroke="#f59e0b" strokeWidth={3} dot={range === 'week'} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="w-full py-4 text-red-400 font-bold text-sm">退出登录</button>
        </div>
      </main>
    );
  }

  // --- 首页视图 ---
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-black text-yellow-500">醒了么</h1>
          <button onClick={() => user ? setView('profile') : router.push('/login')} className="mt-2 text-gray-500 font-bold hover:text-yellow-600 transition-all underline decoration-2 underline-offset-4">
            你好，{nickname} 👋
          </button>
          <p className="mt-6 text-orange-500 text-sm font-medium italic px-4">
            {hasWoken ? QUOTES[Math.floor(Math.random()*QUOTES.length)] : status}
          </p>
        </div>

        <div className="flex justify-center py-4">
          <button 
            onClick={async () => {
              if(!user) return router.push('/login');
              const { error } = await supabase.from('wake_up_logs').insert([{ user_id: user.id, wake_date: getChinaDate() }]);
              if (error) alert("今日已打卡");
              else { setHasWoken(true); fetchLogs(user.id); }
            }}
            disabled={hasWoken}
            className={`w-44 h-44 rounded-full font-black text-2xl transition-all shadow-xl active:scale-95 ${hasWoken ? "bg-gray-50 text-green-500 border-4 border-green-100" : "bg-gradient-to-tr from-yellow-400 to-red-500 text-white"}`}
          >
            {hasWoken ? "打卡成功" : "我醒了"}
          </button>
        </div>

        {/* 恢复的原图表模式 */}
        <div className="pt-6 border-t border-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">最近 7 天起床趋势 (北京时间)</h3>
            <span className="text-[10px] text-gray-300">单位：点钟</span>
          </div>
          <div className="h-44 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.slice(-7)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f9f9f9" />
                  <XAxis dataKey="day" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                  <YAxis domain={[4, 12]} hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: any) => [`${value ?? '0'} 点`, '起床时间']}
                  />
                  <Line type="monotone" dataKey="time" stroke="#f59e0b" strokeWidth={4} dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300 text-sm italic">
                登录后查看你的早起足迹
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}