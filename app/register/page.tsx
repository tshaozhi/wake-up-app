"use client";
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState(''); // 新增昵称状态
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- 校验昵称是否含有特殊符号 ---
    // 允许：中文、英文、数字。禁止：所有特殊符号。
    const nicknameRegex = /^[a-zA-Z0-9\u4e00-\u9fa5]+$/;
    if (!nicknameRegex.test(nickname)) {
      alert("昵称只能包含中文、英文和数字，不能有特殊符号哦！");
      return;
    }

    setLoading(true);

    // 调用 Supabase 注册
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // 将昵称存入 user_metadata，这样以后可以直接通过 user 对象读取
        data: {
          full_name: nickname, 
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      alert("注册失败：" + error.message);
    } else {
      alert("注册成功！请检查邮箱激活（或直接尝试登录）。");
      router.push('/login');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-gray-800">加入“醒了么”</h1>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          {/* --- 新增：昵称输入框 --- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户昵称</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-400 outline-none"
              placeholder="起个好听的名字"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱地址</label>
            <input 
              type="email" required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-400 outline-none"
              placeholder="name@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input 
              type="password" required minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-400 outline-none"
              placeholder="至少6位密码"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-orange-400 to-red-400 text-white font-bold rounded-xl shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? "提交中..." : "立即注册"}
          </button>
        </form>
      </div>
    </main>
  );
}