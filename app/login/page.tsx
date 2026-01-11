"use client";
import { useState } from 'react';
import { createClient } from '@/lib/supabase'; // 导入刚才创建的配置
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 真实登录请求
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("登录失败：" + error.message);
    } else {
      alert("登录成功！");
      router.push('/');
      router.refresh(); // 刷新页面状态
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-gray-800">欢迎回来</h1>
          <p className="text-gray-500 text-sm mt-2">登录“醒了么”，开始记录晨间时光</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱地址</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            立即登录
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <span className="text-gray-500">还没有账号？</span>
          <button 
            type="button" // 显式声明为 button 避免触发 form 提交
            onClick={() => router.push('/register')} // 添加这行跳转代码
            className="ml-1 text-yellow-600 font-bold hover:underline cursor-pointer"
          >
            立即注册
          </button>
        </div>
      </div>

      <button 
        onClick={() => router.push('/')}
        className="mt-6 text-gray-400 text-sm hover:text-gray-600"
      >
        ← 返回首页
      </button>
    </main>
  );
}