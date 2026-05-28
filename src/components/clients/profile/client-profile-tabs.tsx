"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "@/components/clients/profile/tabs/overview-tab";
import { FamilyTab } from "@/components/clients/profile/tabs/family-tab";
import { ResidencyTab } from "@/components/clients/profile/tabs/residency-tab";
import { NotesTab } from "@/components/clients/profile/tabs/notes-tab";
import { TimelineTab } from "@/components/clients/profile/tabs/timeline-tab";
import { TasksTab } from "@/components/clients/profile/tabs/tasks-tab";

interface ClientProfileTabsProps {
  client: any;
  familyGroups?: any[];
}

export function ClientProfileTabs({ client, familyGroups = [] }: ClientProfileTabsProps) {
  const totalFamilyMembers = familyGroups.reduce((sum, g) => sum + g.members.length, 0);

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="bg-muted/50 border border-border h-9 flex-wrap">
        {[
          { value: "overview", label: "Overview" },
          { value: "family", label: `Family ${totalFamilyMembers > 0 ? `(${totalFamilyMembers})` : ""}` },
          { value: "residency", label: "Residency" },
          { value: "tasks", label: `Tasks (${client.tasks?.length || 0})` },
          { value: "notes", label: `Notes (${client.notes?.length || 0})` },
          { value: "timeline", label: "Timeline" },
        ].map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="text-xs h-7 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="mt-0 animate-fade-in">
        <OverviewTab client={client} />
      </TabsContent>
      <TabsContent value="family" className="mt-0 animate-fade-in">
        <FamilyTab client={client} familyGroups={familyGroups} />
      </TabsContent>
      <TabsContent value="residency" className="mt-0 animate-fade-in">
        <ResidencyTab client={client} />
      </TabsContent>
      <TabsContent value="tasks" className="mt-0 animate-fade-in">
        <TasksTab client={client} />
      </TabsContent>
      <TabsContent value="notes" className="mt-0 animate-fade-in">
        <NotesTab client={client} />
      </TabsContent>
      <TabsContent value="timeline" className="mt-0 animate-fade-in">
        <TimelineTab client={client} />
      </TabsContent>
    </Tabs>
  );
}
