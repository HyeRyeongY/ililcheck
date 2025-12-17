import Sidebar from '@/components/layout/Sidebar';
import MainHeader from '@/components/layout/MainHeader';
import ProtectedRoute from '@/components/ProtectedRoute';
import { CategoryProvider } from '@/contexts/CategoryContext';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <CategoryProvider>
        <div className={styles.wrapper}>
          <MainHeader />
          <div className={styles.container}>
            <Sidebar />
            <main className={styles.main}>
              {children}
            </main>
          </div>
        </div>
      </CategoryProvider>
    </ProtectedRoute>
  );
}
