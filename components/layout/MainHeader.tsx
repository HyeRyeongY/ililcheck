"use client";

import { useAuth } from "@/contexts/AuthContext";
import { checkAdminStatus } from "@/lib/admin";
import { logout } from "@/lib/auth";
import { LogOut, MessageCircleHeart, MoreVertical, Settings, Shield } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./MainHeader.module.css";

export default function MainHeader() {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const adminStatus = await checkAdminStatus(user.uid);
        setIsAdmin(adminStatus);
      }
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.title}>ililcheck</h1>
      </div>

      <div className={styles.right}>
        <span className={styles.welcome}>
          <b>{user?.displayName || "사용자"}</b> 님 환영합니다 <MessageCircleHeart className={styles.icon}/>
        </span>

        <div className={styles.menuContainer} ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={styles.moreButton}
          >
            <MoreVertical className={styles.icon} />
          </button>

          {isMenuOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownItem}>
                <span className={styles.emailLabel}>이메일</span>
                <span className={styles.emailValue}>
                  {user?.email || "없음"}
                </span>
              </div>

              <div className={styles.divider} />

              {isAdmin && (
                <Link
                  href="/admin"
                  className={styles.dropdownLink}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Shield className={styles.dropdownIcon} />
                  관리자 페이지
                </Link>
              )}

              <Link
                href="/profile"
                className={styles.dropdownLink}
                onClick={() => setIsMenuOpen(false)}
              >
                <Settings className={styles.dropdownIcon} />내 정보 수정
              </Link>
            </div>
          )}
        </div>
        <button onClick={handleLogout} className={styles.logoutButton}>
            <LogOut className={styles.icon} />
          </button>
      </div>
    </header>
  );
}
