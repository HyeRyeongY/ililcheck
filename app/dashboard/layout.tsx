import Sidebar from '@/components/layout/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className={styles.container}>
        <Sidebar />
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
