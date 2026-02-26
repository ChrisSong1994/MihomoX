import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

export default async function RootPage() {
  // 使用 next-intl 获取用户的语言偏好
  const locale = await getLocale();
  
  // 重定向到用户偏好的语言主页
  redirect(`/${locale}`);
}

export const dynamic = 'force-dynamic';