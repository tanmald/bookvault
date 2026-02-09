import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/layout/Footer';
import { BookOpen, ArrowLeft, Scale, Shield, FileText, AlertTriangle } from 'lucide-react';

export default function ResponsibleUse() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-3xl space-y-6">
          <div className="flex flex-col items-center space-y-2 text-center">
            <div className="flex items-center gap-2">
              <BookOpen className="h-10 w-10 text-accent" />
              <span className="text-3xl font-semibold tracking-tight">BookVault</span>
            </div>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Scale className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t('legal.termsTitle')}</CardTitle>
              <p className="text-muted-foreground">{t('legal.termsSubtitle')}</p>
            </CardHeader>
            <CardContent className="space-y-8">
              <section className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">
                  {t('legal.introText')}
                </p>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">{t('legal.responsibleUseTitle')}</h2>
                </div>
                <div className="space-y-2 text-muted-foreground">
                  <p>{t('legal.responsibleUseText1')}</p>
                  <p>{t('legal.responsibleUseText2')}</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>{t('legal.responsibleUseBullet1')}</li>
                    <li>{t('legal.responsibleUseBullet2')}</li>
                    <li>{t('legal.responsibleUseBullet3')}</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">{t('legal.copyrightTitle')}</h2>
                </div>
                <div className="space-y-2 text-muted-foreground">
                  <p>{t('legal.copyrightText1')}</p>
                  <p>{t('legal.copyrightText2')}</p>
                  <p>{t('legal.copyrightText3')}</p>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <h2 className="text-lg font-semibold">{t('legal.prohibitedTitle')}</h2>
                </div>
                <div className="space-y-2 text-muted-foreground">
                  <p>{t('legal.prohibitedText')}</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>{t('legal.prohibitedBullet1')}</li>
                    <li>{t('legal.prohibitedBullet2')}</li>
                    <li>{t('legal.prohibitedBullet3')}</li>
                    <li>{t('legal.prohibitedBullet4')}</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">{t('legal.liabilityTitle')}</h2>
                </div>
                <div className="space-y-2 text-muted-foreground">
                  <p>{t('legal.liabilityText1')}</p>
                  <p>{t('legal.liabilityText2')}</p>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold">{t('legal.terminationTitle')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.terminationText')}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold">{t('legal.changesTitle')}</h2>
                <p className="text-muted-foreground">
                  {t('legal.changesText')}
                </p>
              </section>

              <div className="pt-4 border-t text-sm text-muted-foreground text-center">
                {t('legal.lastUpdated')}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
