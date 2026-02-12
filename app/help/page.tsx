'use client'

import {
  Upload,
  Database,
  BarChart3,
  MessageSquare,
  FileText,
  Mail,
  ExternalLink,
} from 'lucide-react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const guides = [
  {
    icon: Upload,
    title: 'Uploading Data',
    description: 'Learn how to upload and prepare your data files',
  },
  {
    icon: Database,
    title: 'Managing Datasets',
    description: 'Organize and manage your uploaded datasets',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Analytics',
    description: 'Understand your KPIs and business metrics',
  },
  {
    icon: MessageSquare,
    title: 'AI Assistant',
    description: 'Get the most out of AI-powered insights',
  },
]

const faqs = [
  {
    question: 'What file types can I upload?',
    answer: 'ClarityBoard supports CSV, Excel (.xlsx, .xls), PDF, JSON, TXT, and image files (PNG, JPG, JPEG). Our AI can extract and structure data from any of these formats.',
  },
  {
    question: 'How does the data cleaning work?',
    answer: 'When you upload a file, our system automatically detects column types, removes duplicates, handles missing values, and normalizes data formats. You can review and adjust the cleaning rules before finalizing.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes, all data is encrypted in transit and at rest. We use industry-standard security practices and never share your data with third parties. Enterprise plans include additional security features like SSO and audit logs.',
  },
  {
    question: 'How accurate is the AI assistant?',
    answer: 'Our AI assistant analyzes your actual data to provide insights. While highly accurate for data-driven queries, we recommend verifying critical business decisions with your own analysis.',
  },
  {
    question: 'Can I export my data and reports?',
    answer: 'Yes, you can export your cleaned data in CSV or Excel format, and generate PDF reports of your dashboards and insights at any time.',
  },
  {
    question: 'What happens after my free trial?',
    answer: 'After the 2-month free trial, you can choose to upgrade to a paid plan or continue with limited free features. Your data will be preserved regardless of your choice.',
  },
]

export default function HelpPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader
          title="Help & Support"
          description="Get help with ClarityBoard"
        />
        <main className="flex-1 space-y-6 p-4 md:p-6">
          {/* Quick Start Guides */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Start Guides</CardTitle>
              <CardDescription>
                Learn the basics of ClarityBoard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {guides.map((guide) => (
                  <div
                    key={guide.title}
                    className="flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-accent/50"
                  >
                    <div className="rounded-lg bg-primary/10 p-2">
                      <guide.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{guide.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {guide.description}
                      </p>
                      <Button variant="link" className="mt-2 h-auto p-0 text-primary">
                        Read guide
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Common questions about ClarityBoard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left text-foreground">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card>
            <CardHeader>
              <CardTitle>Need More Help?</CardTitle>
              <CardDescription>
                Our support team is here to assist you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-4 rounded-lg border border-border p-4">
                  <div className="rounded-lg bg-muted p-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Email Support</h3>
                    <p className="text-sm text-muted-foreground">support@clarityboard.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-lg border border-border p-4">
                  <div className="rounded-lg bg-muted p-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Documentation</h3>
                    <Button variant="link" className="h-auto p-0 text-primary">
                      View docs
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
