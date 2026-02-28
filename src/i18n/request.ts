import {getRequestConfig} from 'next-intl/server';
import { cookies } from 'next/headers';
 
export default getRequestConfig(async () => {
  // 优先从 cookie 中获取语言设置
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  
  // 优先级：cookie > 默认中文
  const locale = cookieLocale || 'zh';
  
  // 确保 locale 有效
  const validLocale = ['zh', 'en'].includes(locale) ? locale : 'zh';
  
  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default
  };
});
