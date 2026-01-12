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
  const [errorMsg, setErrorMsg] = useState("");
  const [nickStatus, setNickStatus] = useState<{msg: string, isError: boolean} | null>(null);
  const [greeting, setGreeting] = useState("欢迎回来");
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) setGreeting("早安，清晨的第一缕阳光 ☀️");
    else if (hour >= 11 && hour < 18) setGreeting("下午好，喝杯咖啡提提神 ☕");
    else setGreeting("晚上好，享受轻松的傍晚 🌙");
  }, []);

  const checkNickname = async () => {
    if (!isRegister || nickname.length < 2) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('nickname', nickname.trim());

    if (error) return;
    if (data && data.length > 0) {
      setNickStatus({ msg: "🔴 昵称已被占用", isError: true });
    } else {
      setNickStatus({ msg: "🟢 昵称可用", isError: false });
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (isRegister && (nickStatus?.isError || nickname.length < 2)) return setErrorMsg("请先修正昵称");
    if (password.length < 6) return setErrorMsg("密码至少 6 位");

    setLoading(true);

    if (isRegister) {
      setLoading(true);
      setErrorMsg("");

      // 1. 预检：查重昵称（不消耗频率限制）
      const { data: nickCheck } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('nickname', nickname.trim())
        .maybeSingle();

      if (nickCheck) {
        setLoading(false);
        return setErrorMsg(`昵称「${nickname}」已被占用`);
      }

      // 2. 执行注册
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: nickname } },
      });

      if (signUpError) {
        // 捕获各种错误
        if (signUpError.status === 429) setErrorMsg("请求太频繁，请稍后再试");
        else setErrorMsg(signUpError.message);
      } else if (data.user) {
        // 3. 拦截重复邮箱的“假成功”
        const isActuallyNew = data.user.identities && data.user.identities.length > 0;
        
        if (!isActuallyNew) {
          setErrorMsg("该邮箱已被注册，请直接登录");
        } else {
          // 4. 重点：关闭邮件验证后，这里一定会有 session
          // 只要有 session，就立即跳转
          if (data.session) {
            console.log("注册并登录成功，正在跳转...");
            router.push("/");
            router.refresh();
          } else {
            // 万一还是没 session (比如后台没保存成功)
            setErrorMsg("服务器未返回登录状态，请尝试手动登录");
          }
        }
      }
      setLoading(false);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErrorMsg("邮箱或密码错误");
      else {
        router.push("/");
        router.refresh();
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black text-yellow-500 tracking-tight">醒了么</h1>
          <p className="text-gray-400 text-sm mt-2 font-medium">{greeting}</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-500 text-[11px] p-3 rounded-xl border border-red-100 flex items-center gap-2">
            <span>⚠️</span> {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <div className="relative">
              <label className="text-[10px] font-bold text-gray-400 ml-2 uppercase">昵称</label>
              <input
                type="text"
                placeholder="中英文数字"
                className={`w-full p-4 mt-1 bg-gray-50 border rounded-2xl outline-none transition-all ${nickStatus?.isError ? 'border-red-200' : 'border-gray-100 focus:border-yellow-400'}`}
                value={nickname}
                onChange={(e) => { setNickname(e.target.value); setNickStatus(null); }}
                onBlur={checkNickname}
                required
              />
              {nickStatus && (
                <span className={`absolute right-4 bottom-4 text-[10px] font-bold ${nickStatus.isError ? 'text-red-400' : 'text-green-500'}`}>
                  {nickStatus.msg}
                </span>
              )}
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-gray-400 ml-2 uppercase">邮箱</label>
            <input type="email" placeholder="example@mail.com" className="w-full p-4 mt-1 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-yellow-400" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 ml-2 uppercase">密码</label>
            <input type="password" placeholder="不少于 6 位" className="w-full p-4 mt-1 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-yellow-400" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <button type="submit" disabled={loading || (isRegister && nickStatus?.isError)} className="w-full bg-yellow-500 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-yellow-600 transition-all disabled:bg-gray-200">
            {loading ? "处理中..." : isRegister ? "立即加入" : "登录"}
          </button>
        </form>

        <div className="text-center">
          <button onClick={() => { setIsRegister(!isRegister); setErrorMsg(""); setNickStatus(null); }} className="text-xs font-bold text-gray-400 hover:text-yellow-600">
            {isRegister ? "已有账号？去登录" : "还没账号？点击注册"}
          </button>
        </div>
      </div>
    </main>
  );
}