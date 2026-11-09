
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Participant = {
  id: string;
  affiliation: string;
  interests: string[];
  theme: string;
  published: boolean;
  created_at: string;
};

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  async function checkAdmin(userId: string) {
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      await supabase.auth.signOut();
      setLoggedIn(false);
      setMessage("管理者として登録されていないアカウントです。");
      return false;
    }

    setLoggedIn(true);
    await fetchParticipants();
    return true;
  }

  async function fetchParticipants() {
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage("参加者データを取得できませんでした。");
      return;
    }

    setParticipants(data || []);
  }

  useEffect(() => {
    async function initialize() {
      const { data } = await supabase.auth.getSession();

      if (data.session?.user) {
        await checkAdmin(data.session.user.id);
      }

      setChecking(false);
    }

    initialize();
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage("ログインできませんでした。入力内容を確認してください。");
      setLoading(false);
      return;
    }

    if (data.user) {
      await checkAdmin(data.user.id);
    }

    setLoading(false);
  }

  async function handlePublish(id: string) {
    const { error } = await supabase
      .from("participants")
      .update({ published: true })
      .eq("id", id);

    if (error) {
      console.error(error);
      setMessage("公開に失敗しました。");
      return;
    }

    setMessage("参加者を公開しました！");
    await fetchParticipants();
  }

  async function handleUnpublish(id: string) {
    const { error } = await supabase
      .from("participants")
      .update({ published: false })
      .eq("id", id);

    if (error) {
      console.error(error);
      setMessage("非公開への変更に失敗しました。");
      return;
    }

    setMessage("参加者を非公開にしました。");
    await fetchParticipants();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setLoggedIn(false);
    setParticipants([]);
    setEmail("");
    setPassword("");
    setMessage("");
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        認証状態を確認しています...
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 via-white to-blue-50 p-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-gray-800">
            ACADEMIC SPECTRUM
          </h1>
          <p className="mt-2 text-gray-500">管理者ログイン</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 p-3"
              />
            </div>

            {message && (
              <p className="text-sm text-red-600">{message}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gray-800 px-6 py-3 text-white disabled:opacity-50"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const unpublished = participants.filter((p) => !p.published);
  const published = participants.filter((p) => p.published);

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              管理者ページ
            </h1>
            <p className="mt-2 text-gray-500">
              ACADEMIC SPECTRUM
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-full bg-gray-700 px-5 py-2 text-white"
          >
            ログアウト
          </button>
        </div>

        {message && (
          <p className="mt-5 rounded-xl bg-white p-4 text-sm text-gray-700">
            {message}
          </p>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-bold text-gray-800">
            公開待ちの参加者（{unpublished.length}人）
          </h2>

          {unpublished.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-white p-6 text-gray-500">
              現在、公開待ちの参加者はいません。
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {unpublished.map((person) => (
                <div
                  key={person.id}
                  className="rounded-2xl bg-white p-6 shadow-sm"
                >
                  <p className="font-semibold text-gray-800">
                    所属：{person.affiliation}
                  </p>
                  <p className="mt-2 text-gray-600">
                    関心分野：{person.interests.join("、")}
                  </p>
                  <p className="mt-2 text-gray-600">
                    テーマ：{person.theme}
                  </p>

                  <button
                    onClick={() => handlePublish(person.id)}
                    className="mt-5 rounded-full bg-blue-700 px-6 py-3 font-medium text-white hover:bg-blue-600"
                  >
                    公開する
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-800">
            公開中の参加者（{published.length}人）
          </h2>

          <div className="mt-4 space-y-4">
            {published.map((person) => (
              <div
                key={person.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <p className="font-semibold text-gray-800">
                  所属：{person.affiliation}
                </p>
                <p className="mt-2 text-gray-600">
                  関心分野：{person.interests.join("、")}
                </p>
                <p className="mt-2 text-gray-600">
                  テーマ：{person.theme}
                </p>

                <button
                  onClick={() => handleUnpublish(person.id)}
                  className="mt-5 rounded-full border border-gray-400 px-6 py-3 text-gray-700 hover:bg-gray-100"
                >
                  非公開にする
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
