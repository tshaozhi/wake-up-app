"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function WakeUpPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // 状态管理
  const [userNickname, setUserNickname] = useState("");
  const [status, setStatus] = useState("准备好开启新的一天了吗？");
  const [hasWoken, setHasWoken] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. 获取最近 7 天的真实打卡记录并格式化
  const fetchLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('wake_up_logs')
      .select('wake_time, wake_date')
      .order('wake_time', { ascending: true })
      .limit(7);

    if (data) {
      const formatted = data.map((log) => {
        const date = new Date(log.wake_time);
        return {
          day: date.toLocaleDateString('zh-CN', { weekday: 'short' }),
          // 转为小时数字，例如 7:30 转为 7.5，用于坐标轴绘制
          time: parseFloat((date.getHours() + date.getMinutes() / 60).toFixed(2))
        };
      });
      setChartData(formatted);
      
      // 检查今天是否已经打过卡
      const todayDate = new Date().toISOString().split('T')[0];
      const alreadyWoken = data.some(log => log.wake_date === todayDate);
      setHasWoken(alreadyWoken);
      if (alreadyWoken) setStatus(`早安，${user.user_metadata.full_name}！今日打卡已完成。`);
    }
  };

  // 2. 初始化：检查登录状态及获取数据
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUserNickname(user.user_metadata.full_name || "朋友");
        await fetchLogs();
        setLoading(false);
      }
    };
    init();
  }, []);

  // 3. 执行打卡动作
  const handleWakeUp = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    // 生成格式如 "2026-01-11" 的字符串
    const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const { error } = await supabase
      .from('wake_up_logs')
      .insert([{ 
        user_id: user.id, 
        wake_date: todayDate 
      }]);

    if (error) {
      if (error.code === '23505') {
        alert("今天已经打过卡啦！");
        setHasWoken(true);
      } else {
        alert("打卡失败：" + error.message);
      }
    } else {
      setHasWoken(true);
      setStatus(`早安，${userNickname}！打卡成功。`);
      fetchLogs(); // 刷新图表
    }
  };

  // 4. 注销登录
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* 顶部退出按钮 */}
      <div className="w-full max-w-md flex justify-end mb-4">
        <button 
          onClick={handleLogout}
          className="text-sm font-medium text-gray-400 hover:text-red-400 flex items-center gap-1 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          退出登录
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 space-y-8">
        {/* 头部展示区 */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-yellow-500 tracking-tight">醒了么</h1>
          <p className="text-gray-400 mt-1 font-bold">你好，{userNickname} 👋</p>
          <div className="h-px bg-gray-100 my-4 w-1/2 mx-auto"></div>
          <p className="text-gray-600 font-medium">{status}</p>
        </div>

        {/* 打卡大按钮 */}
        <div className="flex justify-center">
          <button 
            onClick={handleWakeUp}
            disabled={hasWoken}
            className={`w-44 h-44 rounded-full font-bold text-2xl shadow-2xl transition-all duration-300 transform active:scale-95 ${
              hasWoken 
              ? "bg-gray-50 text-green-500 border-4 border-green-100 cursor-not-allowed" 
              : "bg-gradient-to-tr from-yellow-400 via-orange-400 to-red-400 text-white hover:rotate-3 shadow-orange-200"
            }`}
          >
            {hasWoken ? "打卡成功" : "我醒了"}
          </button>
        </div>

        {/* 趋势图表区 */}
        <div className="pt-6 border-t border-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">最近 7 天起床趋势</h3>
            <span className="text-[10px] text-gray-300">单位：点钟</span>
          </div>
          <div className="h-44 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f9f9f9" />
                  <XAxis dataKey="day" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                  <YAxis domain={[4, 12]} hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: any) => [`${value ?? '0'} 点`, '起床时间']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="time" 
                    stroke="#f59e0b" 
                    strokeWidth={4} 
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300 text-sm italic">
                暂无历史数据，明天也要准时起床哦
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}