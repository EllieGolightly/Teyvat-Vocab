import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';
import StudyPage from '@/pages/StudyPage/StudyPage';
import HomePage from '@/pages/HomePage/HomePage';
import DataProvider from '@/components/DataProvider';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route element={<DataProvider />}>
          <Route index element={<HomePage />} />
          <Route path="study" element={<StudyPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
