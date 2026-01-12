"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [greeting, setGreeting] = useState("欢迎回来");
  
  const router = useRouter();
  const supabase = createClient();

  // 1. 适配中国时区的欢迎语
  useEffect(() => {
    const getChinaHour = () => {
      const formatter = new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        hour: 'numeric',
        hour12: false
      });
      return parseInt(formatter.format(new Date()));
    };

    const hour = getChinaHour();
    if (hour >= 5 && hour < 11) setGreeting("早安，清晨的第一缕阳光 ☀️");
    else if (hour >= 11 && hour < 13) setGreeting("中午好，记得按时吃午饭 🍱");
    else if (hour >= 13 && hour < 18) setGreeting("下午好，喝杯咖啡提提神 ☕");
    else if (hour >= 18 && hour < 22) setGreeting("晚上好，享受轻松的傍晚 🌙");
    else setGreeting("深夜了，早点休息才能早起 💤");
  }, []);

  // 2. 登录/注册逻辑
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isRegister) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: nickname },
        },
      });
      if (error) alert(error.message);
      else alert("注册成功！请检查邮箱验证或直接登录（取决于Supabase配置）");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) alert("登录失败：" + error.message);
      else router.push("/"); // 登录成功回首页
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-yellow-500 tracking-tight">醒了么</h1>
          <p className="text-gray-400 mt-2 font-medium">{greeting}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">怎么称呼你？</label>
              <input
                type="text"
                placeholder="例如：张三"
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">邮箱地址</label>
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">密码</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-yellow-100 hover:bg-yellow-600 active:scale-[0.98] transition-all disabled:bg-gray-300"
          >
            {loading ? "处理中..." : isRegister ? "立即注册" : "开启早起之旅"}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm text-gray-400 hover:text-yellow-600 transition-colors"
          >
            {isRegister ? "已有账号？直接登录" : "还没账号？创建一个"}
          </button>
        </div>
      </div>
    </main>
  );
}