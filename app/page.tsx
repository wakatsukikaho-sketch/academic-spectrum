  
"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

function getParticipantPosition(person: any) {
  const anchors = {
    humanities: { x: 10, y: 15 },
    social_sciences: { x: 90, y: 15 },
    natural_sciences: { x: 10, y: 85 },
    information_science: { x: 90, y: 85 },
    arts_design: { x: 50, y: 90 },
    other: { x: 50, y: 15 },
  };

  const keys = Object.keys(anchors) as (keyof typeof anchors)[];

  const total = keys.reduce(
    (sum, key) => sum + Number(person[key] || 0),
    0
  );

  if (total === 0) {
    return { x: 50, y: 50 };
  }

  const x = keys.reduce(
    (sum, key) =>
      sum + anchors[key].x * Number(person[key] || 0),
    0
  ) / total;

  const y = keys.reduce(
    (sum, key) =>
      sum + anchors[key].y * Number(person[key] || 0),
    0
  ) / total;

  // 同じ位置に重ならないよう、参加者ごとに少しずらす
  const hash = String(person.id)
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  const offsetX = (hash % 7) - 3;
  const offsetY = (hash % 11) - 5;

  return {
    x: Math.max(5, Math.min(95, x + offsetX)),
    y: Math.max(8, Math.min(92, y + offsetY)),
  };
}

function getParticipantColor(person: any) {
  const colors = {
    humanities: [183, 138, 185],
    social_sciences: [134, 168, 200],
    natural_sciences: [145, 185, 157],
    information_science: [214, 179, 111],
    arts_design: [217, 155, 145],
    other: [169, 161, 201],
  };

  const keys = Object.keys(colors) as (keyof typeof colors)[];

  const total = keys.reduce(
    (sum, key) => sum + Number(person[key] || 0),
    0
  );

 if (total === 0) {
  return "rgb(125, 115, 145)";
}

  const mixedColor = [0, 0, 0];

  keys.forEach((key) => {
    const ratio = Number(person[key] || 0) / total;

    colors[key].forEach((channel, index) => {
      mixedColor[index] += channel * ratio;
    });
  });

 return `rgb(${mixedColor
  .map((value) => Math.round(value * 0.68))
  .join(", ")})`;
}

export default function Home() {
  const [participants, setParticipants] = useState<any[]>([]);
  // 参加者全体の関心分野を集計する
const fieldTotals = {
  humanities: participants.reduce(
    (sum, person) => sum + Number(person.humanities || 0),
    0
  ),
  social_sciences: participants.reduce(
    (sum, person) => sum + Number(person.social_sciences || 0),
    0
  ),
  natural_sciences: participants.reduce(
    (sum, person) => sum + Number(person.natural_sciences || 0),
    0
  ),
  information_science: participants.reduce(
    (sum, person) => sum + Number(person.information_science || 0),
    0
  ),
  arts_design: participants.reduce(
    (sum, person) => sum + Number(person.arts_design || 0),
    0
  ),
  other: participants.reduce(
    (sum, person) => sum + Number(person.other || 0),
    0
  ),
};
// 6分野すべての関心度の合計
const totalFieldInterest =
  fieldTotals.humanities +
  fieldTotals.social_sciences +
  fieldTotals.natural_sciences +
  fieldTotals.information_science +
  fieldTotals.arts_design +
  fieldTotals.other;
  const [selectedParticipant, setSelectedParticipant] = useState<any | null>(null);
  // 分野ごとの関心度に応じて水彩色の濃さを計算する
function getFieldOpacity(field: keyof typeof fieldTotals) {
  if (totalFieldInterest === 0) {
    return 0.25;
  }

  const ratio = fieldTotals[field] / totalFieldInterest;

  return 0.15 + ratio * 0.55;
}

    const fields = [
    { key: "humanities", label: "人文科学" },
    { key: "social_sciences", label: "社会科学" },
    { key: "natural_sciences", label: "自然科学" },
    { key: "information_science", label: "情報科学" },
    { key: "arts_design", label: "芸術・デザイン" },
    { key: "other", label: "その他" },
  ] as const;

  const [ratios, setRatios] = useState({
    humanities: 17,
    social_sciences: 17,
    natural_sciences: 17,
    information_science: 17,
    arts_design: 16,
    other: 16,
  });

  const totalRatio = Object.values(ratios).reduce(
    (sum, value) => sum + value,
    0
  );
  function updateRatio(
    changedKey: keyof typeof ratios,
    newValue: number
  ) {
    const value = Math.max(0, Math.min(100, newValue));

    const otherKeys = fields
      .map((field) => field.key)
      .filter((key) => key !== changedKey);

    const remaining = 100 - value;

    const oldOtherTotal = otherKeys.reduce(
      (sum, key) => sum + ratios[key],
      0
    );

    const newRatios = { ...ratios };
    newRatios[changedKey] = value;

    let assigned = 0;

    otherKeys.forEach((key, index) => {
      if (index === otherKeys.length - 1) {
        newRatios[key] = remaining - assigned;
      } else {
        const share =
          oldOtherTotal === 0
            ? remaining / otherKeys.length
            : (ratios[key] / oldOtherTotal) * remaining;

        const rounded = Math.round(share);
        newRatios[key] = rounded;
        assigned += rounded;
      }
    });

    setRatios(newRatios);
  }

  useEffect(() => {
    async function fetchParticipants() {
      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .eq("published", true);

      if (error) {
        console.error("参加者データの取得に失敗しました:", error);
        return;
      }

      setParticipants(data || []);
    }

    fetchParticipants();

    const channel = supabase
      .channel("participants-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  return (
    <main className="min-h-screen overflow-hidden bg-[#faf9f6] text-[#343b45]">
      <header className="relative z-10 flex items-center justify-between px-8 py-6 md:px-16">
        <div className="text-lg font-semibold tracking-widest">
          ACADEMIC SPECTRUM
        </div>
        <div className="text-sm text-gray-500">
          UNIVERSITY FESTIVAL 2026
        </div>
      </header>

      <section className="relative flex min-h-[650px] flex-col items-center justify-center px-6 py-16 text-center">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background: `
  radial-gradient(ellipse at 10% 15%, rgba(183, 138, 185, $DIL0) 0%, transparent 55%),
  radial-gradient(ellipse at 90% 15%, rgba(134, 168, 200, $DIL1) 0%, transparent 55%),
  radial-gradient(ellipse at 10% 85%, rgba(145, 185, 157, $DIL2) 0%, transparent 55%),
  radial-gradient(ellipse at 90% 85%, rgba(214, 179, 111, $DIL3) 0%, transparent 55%),
  radial-gradient(ellipse at 50% 15%, rgba(169, 161, 201, $DIL4) 0%, transparent 55%),
  radial-gradient(ellipse at 50% 90%, rgba(217, 155, 145, $DIL5) 0%, transparent 55%),
 #fffdf8
`,
backgroundImage: `
  radial-gradient(rgba(120, 105, 85, 0.08) 0.6px, transparent 0.6px)
`,
backgroundSize: "5px 5px",
            filter: "blur(35px)",
          }}
        />

        <div className="relative z-10 max-w-4xl">
          <p className="mb-6 text-xs font-semibold tracking-[0.35em] text-gray-500">
            DISCOVER THE CONNECTIONS
          </p>

          <h1 className="text-4xl font-light leading-tight tracking-tight md:text-7xl">
            Where Do Our
            <br />
            <span className="font-semibold">Interests</span> Meet?
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-sm leading-8 text-gray-600 md:text-base">
            私たちの関心は、どこで交わるのだろう。
            <br />
            一人ひとりの知的好奇心を、ひとつのマップに。
            <br />
            異なる分野のあいだに、新しいつながりを見つけよう。
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="#map-preview"
              className="rounded-full bg-[#454e5c] px-9 py-4 text-sm text-white transition hover:bg-[#626e7e]"
            >
              マップを見る →
            </a>

            <a
              href="#participate"
              className="rounded-full border border-gray-400 bg-white/60 px-9 py-4 text-sm transition hover:bg-white"
            >
              参加する ＋
            </a>
          </div>
        </div>
      </section>

      <section id="map-preview" className="px-6 py-20 md:px-16">
        <div className="mx-auto max-w-5xl">
                
       <div className="mb-10 text-center">
            <p className="text-xs tracking-[0.3em] text-gray-400">
              OUR INTERESTS
            </p>
            <h2 className="mt-3 text-2xl font-medium">
              関心が交わる場所
            </h2>
            <p className="mt-3 text-sm text-gray-500">
              それぞれの興味が、ひとつの風景をつくります。
            </p>
            <p className="mt-3 text-sm font-medium text-gray-600">
  現在の公開参加者数：{participants.length}人
</p>
          </div>

          <div
            className="relative h-[380px] overflow-hidden rounded-[32px] shadow-sm md:h-[480px]"
            
style={{
  background: `
    radial-gradient(
      ellipse at 10% 15%,
      rgba(183, 138, 185, 0.48) 0%,
      transparent 42%
    ),
    radial-gradient(
      ellipse at 90% 15%,
      rgba(134, 168, 200, 0.48) 0%,
      transparent 42%
    ),
    radial-gradient(
      ellipse at 10% 85%,
      rgba(145, 185, 157, 0.48) 0%,
      transparent 42%
    ),
    radial-gradient(
      ellipse at 90% 85%,
      rgba(214, 179, 111, 0.48) 0%,
      transparent 42%
    ),
    radial-gradient(
      ellipse at 50% 15%,
      rgba(169, 161, 201, 0.35) 0%,
      transparent 42%
    ),
    radial-gradient(
      ellipse at 50% 90%,
      rgba(217, 155, 145, 0.38) 0%,
      transparent 42%
    ),
    #fffdf8
  `,
}}

          >
          
{participants.map((person, i) => (
  <button
    key={person.id}
    type="button"
    aria-label={`参加者 ${person.display_name || i + 1}`}
    onClick={() => setSelectedParticipant(person)}
    className="absolute flex h-8 w-8 items-center justify-center rounded-full border border-white/80 text-sm font-bold text-white shadow-md transition hover:scale-150 md:h-9 md:w-9"
    style={{
      left: `${getParticipantPosition(person).x}%`,
      top: `${getParticipantPosition(person).y}%`,
      backgroundColor: getParticipantColor(person),
    }}
  >
    {person.display_name?.trim()?.charAt(0) || "?"}
  </button>
))}

              

{selectedParticipant && (
  <div className="absolute left-1/2 top-1/2 z-20 w-[85%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl backdrop-blur-md">

    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-lg font-semibold text-gray-800">
        参加者プロフィール
      </h3>

      <button
        type="button"
        onClick={() => setSelectedParticipant(null)}
        className="rounded-full px-3 py-1 text-sm text-gray-500 hover:bg-gray-100"
      >
        ✕
      </button>
    </div>

    <p className="mb-4 text-sm text-gray-600">
      所属：{selectedParticipant.affiliation}
    </p>

    <h4 className="mb-3 text-sm font-semibold text-gray-700">
      関心分野の割合
    </h4>

    {[
      { label: "人文科学", key: "humanities", color: "#b78ab9" },
      { label: "社会科学", key: "social_sciences", color: "#86a8c8" },
      { label: "自然科学", key: "natural_sciences", color: "#91b99d" },
      { label: "情報科学", key: "information_science", color: "#d6b36f" },
      { label: "芸術・デザイン", key: "arts_design", color: "#d99b91" },
      { label: "その他", key: "other", color: "#a9a1c9" },
    ].map((field) => (
      <div key={field.key} className="mb-3">
        <div className="mb-1 flex justify-between text-xs text-gray-600">
          <span>{field.label}</span>
          <span>
            {selectedParticipant[field.key]}%
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full"
            style={{
              width: `${selectedParticipant[field.key]}%`,
              backgroundColor: field.color,
            }}
          />
        </div>
      </div>
    ))}

    <div className="mt-5 border-t border-gray-200 pt-4">
      <h4 className="mb-2 text-sm font-semibold text-gray-700">
        関心テーマ
      </h4>
      <p className="text-sm leading-relaxed text-gray-600">
        {selectedParticipant.theme}
      </p>
    </div>

  </div>
)}

            <div className="absolute bottom-5 right-6 rounded-full bg-white/70 px-4 py-2 text-xs text-gray-600 backdrop-blur">
              SAMPLE MAP
            </div>
          </div>
                    {/* 関心分野のカラー凡例 */}
          <div className="mt-8 rounded-2xl border border-white/70 bg-white/60 p-6 backdrop-blur-sm">
            <h3 className="mb-5 text-center text-sm font-medium tracking-wider text-gray-600">
              INTEREST COLORS
            </h3>

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              {[
                { label: "人文科学", color: "#b78ab9" },
                { label: "社会科学", color: "#86a8c8" },
                { label: "自然科学", color: "#91b99d" },
                { label: "情報科学", color: "#d6b36f" },
                { label: "芸術・デザイン", color: "#d99b91" },
                { label: "その他", color: "#a9a1c9" },
              ].map((field) => (
                <div key={field.label} className="flex items-center gap-3">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full shadow-sm"
                    style={{ backgroundColor: field.color }}
                  />
                  <span className="text-sm text-gray-600">
                    {field.label}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-5 text-center text-xs leading-6 text-gray-400">
              アイコンの色は、それぞれの関心分野の割合を反映しています。
            </p>
          </div>
        </div>
      </section>

      <section id="participate" className="px-6 py-20">
  <div className="mx-auto max-w-2xl">
    <div className="mb-10 text-center">
      <p className="text-xs tracking-[0.3em] text-gray-400">
        JOIN OUR COMMUNITY
      </p>
      <h2 className="mt-4 text-3xl font-medium">
        あなたの関心を教えてください。
      </h2>
      <p className="mt-4 text-sm leading-7 text-gray-500">
        あなたの興味が、新しいつながりを生み出します。
      </p>
    </div>


    <form
      className="space-y-8 rounded-3xl bg-white p-8 shadow-sm"
      onSubmit={async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const data = new FormData(form);

const interests = fields
  .filter((field) => ratios[field.key] > 0)
  .map((field) => field.label);

  const { error } = await supabase
    .from("participants")
    .insert({
  display_name: (data.get("display_name") as string).trim(),
  affiliation: data.get("affiliation") as string,
  interests: interests,
  theme: data.get("theme") as string,
  published: true,

x: Math.floor(Math.random() * 80) + 10,
y: Math.floor(Math.random() * 70) + 15,

  humanities: ratios.humanities,
  social_sciences: ratios.social_sciences,
  natural_sciences: ratios.natural_sciences,
  information_science: ratios.information_science,
  arts_design: ratios.arts_design,
  other: ratios.other,
});

 if (error) {
  console.error("Supabase registration error:", {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });

  window.alert(
    "登録に失敗しました。\n" +
    "エラー：" + error.message + "\n" +
    "詳細：" + error.details + "\n" +
    "ヒント：" + error.hint + "\n" +
    "コード：" + error.code
  );
}

  window.alert(
    "登録を受け付けました！\n運営側で確認した後、マップに公開されます。"
  );

        form.reset();
      }}
    >      {/* 所属 */}
    {/* 表示名 */}
<div>
  <label className="mb-2 block text-sm font-medium">
    表示名（フルネームまたはハンドルネーム）
  </label>
  <input
    type="text"
    name="display_name"
    required
    maxLength={30}
    placeholder="例：花帆、Anna、Michael"
    className="w-full rounded-xl border border-gray-300 p-3 text-sm"
  />
  <p className="mt-2 text-xs text-gray-400">
    マップ上のアイコンに、表示名の最初の1文字が表示されます。
  </p>
</div>
      <div>
        <label className="mb-2 block text-sm font-medium">
          あなたの所属
        </label>
        <select
          name="affiliation"
          required
          className="w-full rounded-xl border border-gray-300 p-3 text-sm"
        >
          <option value="">選択してください</option>
          <option value="大学院生">大学院生</option>
          <option value="学部生">学部生</option>
          <option value="教職員">教職員</option>
          <option value="その他">その他</option>
        </select>
      </div>

           {/* 関心分野の割合 */}
      <div>
        <p className="mb-2 text-sm font-medium">
          関心のある分野の割合
        </p>

        <p className="mb-5 text-xs leading-6 text-gray-500">
          6つの分野に、あなたの関心を100%になるように配分してください。
          スライダーを動かすと、ほかの分野の割合も自動で調整されます。
        </p>

        <div className="space-y-5">
          {fields.map((field) => (
            <div key={field.key}>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm">
                  {field.label}
                </label>

                <span className="text-sm font-semibold tabular-nums">
                  {ratios[field.key]}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={ratios[field.key]}
                onChange={(event) =>
                  updateRatio(
                    field.key,
                    Number(event.target.value)
                  )
                }
                className="w-full accent-[#8b91b8]"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl bg-[#f5f3f8] p-4">
          <span className="text-sm font-medium">
            合計
          </span>

          <span className="text-lg font-semibold tabular-nums">
            {totalRatio}%
          </span>
        </div>
      </div>

      {/* 研究・関心テーマ */}
      <div>
        <label className="mb-2 block text-sm font-medium">
          研究・関心テーマ
        </label>
        <textarea
          name="theme"
          rows={3}
          required
          placeholder="例：言語と社会の関係、AIと教育..."
          className="w-full rounded-xl border border-gray-300 p-3 text-sm"
        />
      </div>

      {/* 同意確認 */}
      <div>
        <label className="flex items-start gap-2 text-sm text-gray-600">
          <input type="checkbox" required className="mt-1" />
          入力した情報が学園祭のマップに掲載されることに同意します。
        </label>
      </div>

      <button
        type="submit"
        className="w-full rounded-full bg-gray-800 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-700"
      >
        参加登録する
      </button>
  </form>
  </div>
</section>

      <footer className="border-t border-gray-200 px-8 py-8 text-center text-xs text-gray-400">
        ACADEMIC SPECTRUM © 2026
      </footer>
    </main>
  );
}