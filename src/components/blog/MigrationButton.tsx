import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { migrateStaticArticlesToDatabase } from '@/utils/migrateStaticArticles';
import { toast } from 'sonner';
import { Database, Upload } from 'lucide-react';

interface MigrationButtonProps {
  onMigrationComplete: () => void;
}

export const MigrationButton = ({ onMigrationComplete }: MigrationButtonProps) => {
  const [isMigrating, setIsMigrating] = useState(false);
  const { user } = useAuth();

  const handleMigration = async () => {
    if (!user) {
      toast.error('You must be logged in to migrate articles');
      return;
    }

    setIsMigrating(true);
    try {
      const success = await migrateStaticArticlesToDatabase(user.id);
      
      if (success) {
        toast.success('Articles migrated successfully! You can now edit them.');
        onMigrationComplete();
      } else {
        toast.error('Migration failed. Please try again.');
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Migration failed. Please try again.');
    } finally {
      setIsMigrating(false);
    }
  };

  if (!user) return null;

  return (
    <Button 
      onClick={handleMigration} 
      disabled={isMigrating}
      variant="outline"
      className="mb-6"
    >
      {isMigrating ? (
        <>
          <Upload className="w-4 h-4 mr-2 animate-spin" />
          Migrating Articles...
        </>
      ) : (
        <>
          <Database className="w-4 h-4 mr-2" />
          Make Articles Editable
        </>
      )}
    </Button>
  );
};