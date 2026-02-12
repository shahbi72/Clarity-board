'use client'

import { Check, X, Sparkles, Zap, Building2 } from 'lucide-react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useState } from 'react'

interface PlanFeature {
  name: string
  free: boolean | string
  pro: boolean | string
  enterprise: boolean | string
}

const features: PlanFeature[] = [
  { name: 'File uploads per month', free: '10', pro: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Maximum file size', free: '10 MB', pro: '100 MB', enterprise: '1 GB' },
  { name: 'Data records', free: '5,000', pro: '100,000', enterprise: 'Unlimited' },
  { name: 'AI Assistant queries', free: '50/month', pro: '1,000/month', enterprise: 'Unlimited' },
  { name: 'Smart Suggestions', free: true, pro: true, enterprise: true },
  { name: 'Basic charts & analytics', free: true, pro: true, enterprise: true },
  { name: 'Advanced visualizations', free: false, pro: true, enterprise: true },
  { name: 'PDF & Image processing', free: false, pro: true, enterprise: true },
  { name: 'API access', free: false, pro: true, enterprise: true },
  { name: 'Team collaboration', free: false, pro: '5 members', enterprise: 'Unlimited' },
  { name: 'Custom integrations', free: false, pro: false, enterprise: true },
  { name: 'Dedicated support', free: false, pro: false, enterprise: true },
  { name: 'SLA guarantee', free: false, pro: false, enterprise: '99.9%' },
]

const plans = [
  {
    name: 'Free',
    description: 'Perfect for trying out ClarityBoard',
    price: 0,
    yearlyPrice: 0,
    icon: Sparkles,
    badge: '2 months free',
    cta: 'Current Plan',
    ctaVariant: 'outline' as const,
    popular: false,
  },
  {
    name: 'Pro',
    description: 'For growing businesses with more data',
    price: 20,
    yearlyPrice: 16,
    icon: Zap,
    badge: 'Most Popular',
    cta: 'Upgrade to Pro',
    ctaVariant: 'default' as const,
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'For large organizations with custom needs',
    price: 99,
    yearlyPrice: 79,
    icon: Building2,
    badge: null,
    cta: 'Contact Sales',
    ctaVariant: 'outline' as const,
    popular: false,
  },
]

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return <Check className="h-4 w-4 text-primary" />
  }
  if (value === false) {
    return <X className="h-4 w-4 text-muted-foreground/50" />
  }
  return <span className="text-sm text-foreground">{value}</span>
}

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader
          title="Pricing"
          description="Choose the plan that fits your needs"
        />
        <main className="flex-1 p-4 md:p-6">
          {/* Header */}
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground">
              Simple, transparent pricing
            </h2>
            <p className="mt-2 text-muted-foreground">
              Start free for 2 months, then choose a plan that scales with your business
            </p>

            {/* Billing Toggle */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <Label htmlFor="billing-toggle" className={!isYearly ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                Monthly
              </Label>
              <Switch
                id="billing-toggle"
                checked={isYearly}
                onCheckedChange={setIsYearly}
              />
              <Label htmlFor="billing-toggle" className={isYearly ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                Yearly
                <Badge variant="secondary" className="ml-2 text-xs">Save 20%</Badge>
              </Label>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="mx-auto mb-12 grid max-w-5xl gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const PlanIcon = plan.icon
              const displayPrice = isYearly ? plan.yearlyPrice : plan.price

              return (
                <Card
                  key={plan.name}
                  className={`relative flex flex-col ${
                    plan.popular ? 'border-primary shadow-lg' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        {plan.badge}
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className={`rounded-lg p-2 ${plan.popular ? 'bg-primary/10' : 'bg-muted'}`}>
                        <PlanIcon className={`h-5 w-5 ${plan.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                      </div>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-foreground">${displayPrice}</span>
                      {plan.price > 0 && (
                        <span className="text-muted-foreground">/month</span>
                      )}
                      {plan.price > 0 && isYearly && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Billed annually (${displayPrice * 12}/year)
                        </p>
                      )}
                    </div>

                    {plan.badge && plan.name === 'Free' && (
                      <Badge variant="outline" className="mb-4 text-primary border-primary/30">
                        {plan.badge}
                      </Badge>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant={plan.ctaVariant}
                      className="w-full"
                      disabled={plan.name === 'Free'}
                    >
                      {plan.cta}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>

          {/* Feature Comparison */}
          <Card className="mx-auto max-w-5xl">
            <CardHeader>
              <CardTitle>Feature Comparison</CardTitle>
              <CardDescription>See what&apos;s included in each plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-3 text-left text-sm font-medium text-muted-foreground">Feature</th>
                      <th className="py-3 text-center text-sm font-medium text-muted-foreground">Free</th>
                      <th className="py-3 text-center text-sm font-medium text-primary">Pro</th>
                      <th className="py-3 text-center text-sm font-medium text-muted-foreground">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((feature, index) => (
                      <tr
                        key={feature.name}
                        className={index !== features.length - 1 ? 'border-b border-border' : ''}
                      >
                        <td className="py-3 text-sm text-foreground">{feature.name}</td>
                        <td className="py-3 text-center">
                          <div className="flex justify-center">
                            <FeatureValue value={feature.free} />
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex justify-center">
                            <FeatureValue value={feature.pro} />
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex justify-center">
                            <FeatureValue value={feature.enterprise} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* FAQ or CTA */}
          <div className="mx-auto mt-12 max-w-2xl text-center">
            <h3 className="text-xl font-semibold text-foreground">Need help choosing?</h3>
            <p className="mt-2 text-muted-foreground">
              Our team is here to help you find the perfect plan for your business needs.
            </p>
            <Button variant="outline" className="mt-4 bg-transparent">
              Contact Sales
            </Button>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
