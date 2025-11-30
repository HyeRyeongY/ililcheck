import Sidebar from '@/components/layout/Sidebar';
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
        <div className={styles.container}>
          <Sidebar />
          <main className={styles.main}>
            {children}
          </main>
        </div>
      </CategoryProvider>
    </ProtectedRoute>
  );
}
