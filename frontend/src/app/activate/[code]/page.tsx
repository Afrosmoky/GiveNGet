import VerifyClient from '../../../components/VerifyClient';

type Props = {
    params: Promise<{ code: string }>;
};

export default async function VerifyPage({ params }: Props) {
  const { code } = await params;
  return <VerifyClient code={code} />;
}