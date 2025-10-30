import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Folder, Image, Video, Music, FileText, Code, Briefcase } from "lucide-react";

interface Collection {
  id: string;
  name: string;
  type: 'portfolio' | 'project' | 'media' | 'writing' | 'code';
  items_count: number;
  thumbnail?: string;
  description?: string;
}

interface CreativeCollectionsProps {
  collections: Collection[];
  isOwnProfile: boolean;
}

const collectionIcons = {
  portfolio: Briefcase,
  project: Folder,
  media: Video,
  writing: FileText,
  code: Code,
};

export const CreativeCollections = ({ collections, isOwnProfile }: CreativeCollectionsProps) => {
  const [selectedType, setSelectedType] = useState<string>("all");

  const filteredCollections = selectedType === "all" 
    ? collections 
    : collections.filter(c => c.type === selectedType);

  const collectionTypes = [
    { value: "all", label: "All", icon: Folder },
    { value: "portfolio", label: "Portfolios", icon: Briefcase },
    { value: "project", label: "Projects", icon: Folder },
    { value: "media", label: "Media", icon: Video },
    { value: "writing", label: "Writing", icon: FileText },
    { value: "code", label: "Code", icon: Code },
  ];

  if (collections.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Creative Collections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {isOwnProfile 
              ? "Start organizing your creative work into collections" 
              : "No collections yet"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Folder className="h-5 w-5" />
          Creative Collections
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedType} onValueChange={setSelectedType} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
            {collectionTypes.map((type) => {
              const Icon = type.icon;
              return (
                <TabsTrigger key={type.value} value={type.value} className="flex items-center gap-1">
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{type.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCollections.map((collection) => {
              const Icon = collectionIcons[collection.type];
              return (
                <Card key={collection.id} className="overflow-hidden hover:shadow-md transition-all cursor-pointer group">
                  {collection.thumbnail ? (
                    <div className="aspect-video bg-muted overflow-hidden">
                      <img 
                        src={collection.thumbnail} 
                        alt={collection.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <Icon className="h-12 w-12 text-primary/40" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
                        {collection.name}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {collection.items_count}
                      </Badge>
                    </div>
                    {collection.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {collection.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};
