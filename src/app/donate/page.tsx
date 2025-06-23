import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DonatePage() {
  return (
    <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Support Helios Control</h1>
          <Link href="/" passHref>
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span role="img" aria-label="gift">🎁</span> Make a Donation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-muted-foreground">
  <p>
    You're not just donating—you’re <strong>supercharging solar intelligence</strong>. Your support powers the Helio Apps, including <em>HelioHeggie</em>, our smart solar companion that predicts weather and nudges you toward energy-savvy decisions.
  </p>

  <p>
    From effortless battery scheduling and Weather API usage to intuitive dashboards and tariff-aware insights, every pound you give helps us build tools that are as bright as the energy they manage.
  </p>

  <p>
    Whether it’s helping you time your EV charge or plan your laundry day around the sun, HelioHeggie is here to make solar simple—and your donation keeps it evolving.
  </p>

  <div className="space-y-1">
    <p>💡 Got a bug to squash?</p>
    <p>🌱 A feature idea to grow?</p>
    <p>📬 Or just want to say hi?</p>
  </div>

  <p>
    Drop us a line at <a href="mailto:heliosheggie@gmail.com" className="text-primary hover:underline">heliosheggie@gmail.com</a> — we love hearing from fellow solar adventurers.
  </p>

  <p>
    Click below to make a £5 donation and help us keep the lights (and insights) on.
  </p>

  <div className="flex justify-center">
    <a href="https://buy.stripe.com/14A7sK8fK21l8x38Z94wM00" target="_blank" rel="noopener noreferrer">
      <Button className="w-full">
        <span role="img" aria-label="heart">❤️</span> Donate £5 with Stripe
      </Button>
    </a>
  </div>
</CardContent>
        </Card>
      </div>
    </div>
  );
}