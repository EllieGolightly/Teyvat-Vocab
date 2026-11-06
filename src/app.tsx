import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';
import StudyPage from '@/pages/StudyPage/StudyPage';
import HomePage from '@/pages/HomePage/HomePage';
import DataProvider from '@/components/DataProvider';
import ReviewPage from '@/pages/ReviewPage/ReviewPage';
import ProgressPage from '@/pages/ProgressPage/ProgressPage';
import LibraryPage from '@/pages/LibraryPage/LibraryPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route element={<DataProvider />}>
          <Route index element={<HomePage />} />
          <Route path="study" element={<StudyPage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="library" element={<LibraryPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
