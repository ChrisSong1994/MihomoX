export async function GET() {
  return Response.json({
    hostname: '127.0.0.1',
    port: 9099,
    secret: process.env.MIHOMO_SECRET || '',
  });
}
