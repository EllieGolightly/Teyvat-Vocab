import { toast } from "sonner";
import { getPrefs, updatePrefs } from "./prefs";

export function isFavorite(wordId: string) {
  return (getPrefs().favoriteWordIds ?? []).includes(wordId);
}
export function toggleFavorite(wordId: string) {
  const current = getPrefs().favoriteWordIds ?? [];
  const active = !current.includes(wordId);
  try {
    updatePrefs({
      favoriteWordIds: active
        ? [...current, wordId]
        : current.filter((id) => id !== wordId),
    });
    return active;
  } catch {
    toast.error("收藏未能保存，请检查浏览器存储空间");
    return !active;
  }
}
export function speakWord(word: string) {
  if (!("speechSynthesis" in window)) {
    toast.info("当前浏览器不支持朗读");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.8;
  utterance.onerror = (event) => {
    if (event.error !== "interrupted" && event.error !== "canceled")
      toast.error("朗读暂不可用，请检查设备语音设置");
  };
  window.speechSynthesis.speak(utterance);
}
