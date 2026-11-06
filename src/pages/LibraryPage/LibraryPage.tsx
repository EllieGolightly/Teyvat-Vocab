import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Heart, Search, Volume2 } from "lucide-react";
import AppShell, { PageHeading } from "@/components/AppShell";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { openDB, type Word } from "@/lib/db";
import { ASSETS } from "@/lib/assets";
import { getPrefs } from "@/lib/prefs";
import { toggleFavorite, speakWord } from "@/lib/word-tools";

export default function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const onlyFavorites = params.get("filter") === "favorites";
  const [words, setWords] = useState<Word[]>([]);
  const [favorites, setFavorites] = useState(getPrefs().favoriteWordIds ?? []);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(40);
  const [selected, setSelected] = useState<Word | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    openDB()
      .then(
        (db) =>
          new Promise<Word[]>((resolve, reject) => {
            const req = db.transaction("words").objectStore("words").getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          }),
      )
      .then((all) => {
        if (active) setWords(all.sort((a, b) => a.word.localeCompare(b.word)));
      })
      .catch(() => {
        if (active) setError("词书暂时加载失败，请刷新重试。");
      });
    return () => {
      active = false;
    };
  }, []);
  const filtered = useMemo(
    () =>
      words.filter(
        (w) =>
          (!onlyFavorites || favorites.includes(w.id)) &&
          (!query.trim() ||
            `${w.word} ${w.definitionRaw}`
              .toLocaleLowerCase()
              .includes(query.trim().toLocaleLowerCase())),
      ),
    [words, query, onlyFavorites, favorites],
  );
  const favorite = (wordId: string) => {
    toggleFavorite(wordId);
    setFavorites([...(getPrefs().favoriteWordIds ?? [])]);
  };
  return (
    <AppShell>
      <main id="main-content" className="inner-content">
        <PageHeading eyebrow="WORDS OPEN WORLDS" title="随身携带的小小世界" />
        <section className="library-book parchment">
          <img src={ASSETS.bookIllustration} alt="CET-6 词书" />
          <div>
            <span className="eyebrow">TEYVAT COLLECTION</span>
            <h2>大学英语六级</h2>
            <p>{words.length.toLocaleString()} 个核心词汇 · 提瓦特主题例句</p>
            <span className="current-book">
              <Check size={13} />
              当前词书
            </span>
          </div>
        </section>
        <div className="library-tabs" aria-label="单词筛选">
          <button
            className={!onlyFavorites ? "selected" : ""}
            onClick={() => {
              setParams({});
              setLimit(40);
            }}
          >
            全部单词
          </button>
          <button
            className={onlyFavorites ? "selected" : ""}
            onClick={() => {
              setParams({ filter: "favorites" });
              setLimit(40);
            }}
          >
            <Heart size={15} />
            我的收藏 <span>{favorites.length}</span>
          </button>
        </div>
        <label className="search-field">
          <Search size={19} />
          <input
            type="search"
            value={query}
            placeholder="寻找一个单词，或输入中文释义"
            aria-label="搜索单词或中文释义"
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(40);
            }}
          />
        </label>
        <div className="word-list parchment">
          {error ? (
            <p className="empty-state" role="alert">
              {error}
            </p>
          ) : !words.length ? (
            <p className="empty-state" role="status">
              正在翻开词书…
            </p>
          ) : filtered.length ? (
            <>
              {filtered.slice(0, limit).map((w) => (
                <div className="word-row" key={w.id}>
                  <button onClick={() => setSelected(w)}>
                    <strong>{w.word}</strong>
                    <span>{w.definitionRaw}</span>
                  </button>
                  <button
                    className={`icon-button ${favorites.includes(w.id) ? "favorited" : ""}`}
                    aria-label={`${favorites.includes(w.id) ? "取消收藏" : "收藏"} ${w.word}`}
                    aria-pressed={favorites.includes(w.id)}
                    onClick={() => favorite(w.id)}
                  >
                    <Heart
                      size={18}
                      fill={favorites.includes(w.id) ? "currentColor" : "none"}
                    />
                  </button>
                </div>
              ))}
              {filtered.length > limit && (
                <button
                  className="load-more"
                  onClick={() => setLimit(limit + 40)}
                >
                  继续翻阅 · 还有 {filtered.length - limit} 词
                </button>
              )}
            </>
          ) : (
            <div className="empty-state">
              <Heart size={28} />
              <h2>
                {onlyFavorites && !query
                  ? "还没有收藏的单词"
                  : "没有找到匹配的单词"}
              </h2>
              <p>
                {onlyFavorites && !query
                  ? "学习时轻点爱心，把喜欢或想多看一眼的词留在这里。"
                  : "试试其他拼写，或用中文释义搜索。"}
              </p>
            </div>
          )}
        </div>
        <p className="page-footnote">
          目前提供 CET-6 词书，收藏不会改变学习进度。
        </p>
      </main>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="teyvat-dialog word-detail">
          {selected && (
            <>
              <DialogHeader>
                <span className="eyebrow">A WORD TO KEEP</span>
                <DialogTitle>{selected.word}</DialogTitle>
                <DialogDescription>{selected.phonetic}</DialogDescription>
              </DialogHeader>
              <div className="detail-actions">
                <button
                  className="secondary-button"
                  onClick={() => speakWord(selected.word)}
                >
                  <Volume2 size={16} />
                  朗读
                </button>
                <button
                  className="secondary-button"
                  onClick={() => favorite(selected.id)}
                >
                  <Heart
                    size={16}
                    fill={
                      favorites.includes(selected.id) ? "currentColor" : "none"
                    }
                  />
                  {favorites.includes(selected.id) ? "已收藏" : "收藏"}
                </button>
              </div>
              <p className="word-definition">{selected.definitionRaw}</p>
              {selected.examples.map((ex, i) => (
                <div className="example-box" key={i}>
                  <p className="english-example">
                    {ex.enParts.map((p, j) =>
                      p.bold ? (
                        <strong key={j}>{p.text}</strong>
                      ) : (
                        <span key={j}>{p.text}</span>
                      ),
                    )}
                  </p>
                  {ex.zh && <p className="chinese-example">{ex.zh}</p>}
                  {ex.sourceRaw && (
                    <p className="example-source">{ex.sourceRaw}</p>
                  )}
                </div>
              ))}
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
