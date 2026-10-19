import { notFound } from 'next/navigation';
import ProfileClient from './ProfileClient';

import { serverApiUrl } from '../../../config/serverApi';

async function getProfileData(userId: string) {
  const res = await fetch(`${serverApiUrl()}/api/profile/${userId}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId) return notFound();
  const data = await getProfileData(userId);
  if (!data) return notFound();
  const { userData, offers, rate } = data;
  return <ProfileClient userData={userData} offers={offers} rate={rate} />;
} 