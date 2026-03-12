import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GTMAnalysis } from '@/hooks/useGTMStrategist';

interface GTMActionPlanProps {
  actionPlan: GTMAnalysis['actionPlan'];
}

const TaskItem: React.FC<{ task: string }> = ({ task }) => {
  const [checked, setChecked] = useState(false);
  return (
    <li
      className="flex items-start gap-3 cursor-pointer group"
      onClick={() => setChecked(v => !v)}
    >
      <div className={cn(
        'w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all duration-200',
        checked ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50',
      )}>
        {checked && <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className={cn('text-sm transition-all duration-200', checked && 'line-through text-muted-foreground')}>{task}</span>
    </li>
  );
};

const GTMActionPlan: React.FC<GTMActionPlanProps> = ({ actionPlan }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">30-Day Action Plan</h2>
      </div>
      <p className="text-sm text-muted-foreground">Check off tasks as you complete them. Progress is local to your session.</p>

      <Tabs defaultValue="week1">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="week1">Week 1</TabsTrigger>
          <TabsTrigger value="week2">Week 2</TabsTrigger>
          <TabsTrigger value="weeks3to4">Weeks 3–4</TabsTrigger>
        </TabsList>
        <TabsContent value="week1" className="mt-4">
          <ul className="space-y-3">
            {actionPlan.week1.map((task, i) => <TaskItem key={i} task={task} />)}
          </ul>
        </TabsContent>
        <TabsContent value="week2" className="mt-4">
          <ul className="space-y-3">
            {actionPlan.week2.map((task, i) => <TaskItem key={i} task={task} />)}
          </ul>
        </TabsContent>
        <TabsContent value="weeks3to4" className="mt-4">
          <ul className="space-y-3">
            {actionPlan.weeks3to4.map((task, i) => <TaskItem key={i} task={task} />)}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GTMActionPlan;
