"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FingerPrintIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { motion, Variants } from "framer-motion";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = await apiClient("/token/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    if (data) {
      toast.success("Login Successful!", {
        description: "Redirecting to your dashboard...",
      });
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      setTimeout(() => router.push("/dashboard"), 1000);
    }

    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4 animated-gradient">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
      >
        
        <motion.div variants={itemVariants} className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/30">
                <FingerPrintIcon className="h-9 w-9 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Attendance Pro</h1>
            <p className="mt-2 text-sm text-gray-300">Log in to access your dashboard.</p>
        </motion.div>

        <motion.form 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          onSubmit={handleLogin} 
          className="mt-8 space-y-6"
        >
          <motion.div variants={itemVariants}>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-gray-300"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white backdrop-blur-sm transition-all duration-300 placeholder:text-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-300"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 pr-10 text-white backdrop-blur-sm transition-all duration-300 placeholder:text-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-red-400"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg border border-transparent bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform duration-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Log In"}
            </button>
          </motion.div>
        </motion.form>
      </motion.div>
    </main>
  );
}