import {getRequestConfig} from 'next-intl/server';
 
export default getRequestConfig(async ({locale}) => ({
  locale: locale || 'zh',
  messages: (await import(`../messages/${locale || 'zh'}.json`)).default
}));
