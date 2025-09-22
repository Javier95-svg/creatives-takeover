import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CollaborationWhiteboard, WhiteboardObject } from '@/hooks/useInteractiveCollaboration';
import { 
  Paintbrush, 
  Square, 
  Circle, 
  Type, 
  Eraser, 
  Move, 
  Trash2, 
  Save,
  Undo2,
  Redo2,
  Palette,
  Users
} from 'lucide-react';
import { Canvas as FabricCanvas, Circle as FabricCircle, Rect as FabricRect, Path as FabricPath, IText as FabricIText } from 'fabric';
import { useToast } from '@/hooks/use-toast';

interface CollaborativeWhiteboardProps {
  whiteboard: CollaborationWhiteboard;
  whiteboardObjects: WhiteboardObject[];
  currentUserId?: string;
  onAddObject: (whiteboardId: string, objectType: WhiteboardObject['object_type'], objectData: any) => void;
  onUpdateObject: (objectId: string, objectData: any) => void;
  onDeleteObject: (objectId: string) => void;
}

type DrawingTool = 'select' | 'draw' | 'rectangle' | 'circle' | 'text' | 'eraser';

export const CollaborativeWhiteboard: React.FC<CollaborativeWhiteboardProps> = ({
  whiteboard,
  whiteboardObjects,
  currentUserId,
  onAddObject,
  onUpdateObject,
  onDeleteObject,
}) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool>('select');
  const [activeColor, setActiveColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: whiteboard.width,
      height: whiteboard.height,
      backgroundColor: whiteboard.background_color,
    });

    // Initialize drawing brush
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = brushSize;

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [whiteboard.width, whiteboard.height, whiteboard.background_color]);

  // Update drawing settings
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === 'draw';
    
    if (activeTool === 'draw' && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = brushSize;
    }
  }, [activeTool, activeColor, brushSize, fabricCanvas]);

  // Handle object creation events
  useEffect(() => {
    if (!fabricCanvas) return;

    const handlePathCreated = (e: any) => {
      const path = e.path;
      if (path) {
        onAddObject(whiteboard.id, 'path', {
          path: path.path,
          stroke: path.stroke,
          strokeWidth: path.strokeWidth,
          fill: path.fill,
          left: path.left,
          top: path.top,
        });
      }
    };

    const handleObjectModified = (e: any) => {
      const obj = e.target;
      if (obj && obj.id) {
        onUpdateObject(obj.id, {
          left: obj.left,
          top: obj.top,
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
          angle: obj.angle,
          ...(obj.type === 'i-text' && { text: obj.text }),
        });
      }
    };

    fabricCanvas.on('path:created', handlePathCreated);
    fabricCanvas.on('object:modified', handleObjectModified);

    return () => {
      fabricCanvas.off('path:created', handlePathCreated);
      fabricCanvas.off('object:modified', handleObjectModified);
    };
  }, [fabricCanvas, whiteboard.id, onAddObject, onUpdateObject]);

  // Sync whiteboard objects
  useEffect(() => {
    if (!fabricCanvas) return;

    // Clear canvas and rebuild from objects
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = whiteboard.background_color;

    whiteboardObjects
      .filter(obj => obj.whiteboard_id === whiteboard.id && !obj.is_deleted)
      .forEach(obj => {
        let fabricObject = null;

        switch (obj.object_type) {
          case 'path':
            fabricObject = new FabricPath(obj.object_data.path, {
              stroke: obj.object_data.stroke,
              strokeWidth: obj.object_data.strokeWidth,
              fill: obj.object_data.fill,
              left: obj.object_data.left,
              top: obj.object_data.top,
            });
            break;
          case 'rect':
            fabricObject = new FabricRect({
              left: obj.object_data.left,
              top: obj.object_data.top,
              width: obj.object_data.width,
              height: obj.object_data.height,
              fill: obj.object_data.fill,
              stroke: obj.object_data.stroke,
              strokeWidth: obj.object_data.strokeWidth,
            });
            break;
          case 'circle':
            fabricObject = new FabricCircle({
              left: obj.object_data.left,
              top: obj.object_data.top,
              radius: obj.object_data.radius,
              fill: obj.object_data.fill,
              stroke: obj.object_data.stroke,
              strokeWidth: obj.object_data.strokeWidth,
            });
            break;
          case 'text':
            fabricObject = new FabricIText(obj.object_data.text, {
              left: obj.object_data.left,
              top: obj.object_data.top,
              fontSize: obj.object_data.fontSize,
              fill: obj.object_data.fill,
              fontFamily: obj.object_data.fontFamily,
            });
            break;
        }

        if (fabricObject) {
          fabricObject.id = obj.id;
          fabricCanvas.add(fabricObject);
        }
      });

    fabricCanvas.renderAll();
  }, [fabricCanvas, whiteboardObjects, whiteboard]);

  const handleToolClick = (tool: DrawingTool) => {
    if (!fabricCanvas) return;

    setActiveTool(tool);

    if (tool === 'rectangle') {
      const rect = new FabricRect({
        left: 100,
        top: 100,
        fill: activeColor,
        width: 100,
        height: 100,
        stroke: activeColor,
        strokeWidth: 2,
      });
      
      fabricCanvas.add(rect);
      onAddObject(whiteboard.id, 'rect', {
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        fill: activeColor,
        stroke: activeColor,
        strokeWidth: 2,
      });
    } else if (tool === 'circle') {
      const circle = new FabricCircle({
        left: 100,
        top: 100,
        fill: activeColor,
        radius: 50,
        stroke: activeColor,
        strokeWidth: 2,
      });
      
      fabricCanvas.add(circle);
      onAddObject(whiteboard.id, 'circle', {
        left: 100,
        top: 100,
        radius: 50,
        fill: activeColor,
        stroke: activeColor,
        strokeWidth: 2,
      });
    } else if (tool === 'text') {
      const text = new FabricIText('Click to edit', {
        left: 100,
        top: 100,
        fontSize: 20,
        fill: activeColor,
        fontFamily: 'Arial',
      });
      
      fabricCanvas.add(text);
      onAddObject(whiteboard.id, 'text', {
        left: 100,
        top: 100,
        text: 'Click to edit',
        fontSize: 20,
        fill: activeColor,
        fontFamily: 'Arial',
      });
    }
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    
    // Mark all objects as deleted
    whiteboardObjects
      .filter(obj => obj.whiteboard_id === whiteboard.id && !obj.is_deleted)
      .forEach(obj => {
        onDeleteObject(obj.id);
      });

    fabricCanvas.clear();
    fabricCanvas.backgroundColor = whiteboard.background_color;
    fabricCanvas.renderAll();
    
    toast({
      title: "Canvas cleared",
      description: "All objects have been removed from the whiteboard",
    });
  };

  const handleDeleteSelected = () => {
    if (!fabricCanvas) return;
    
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && (activeObject as any).customId) {
      onDeleteObject((activeObject as any).customId);
      fabricCanvas.remove(activeObject);
    }
  };

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'
  ];

  const getActiveUsers = () => {
    const userIds = [...new Set(whiteboardObjects.map(obj => obj.created_by))];
    return userIds.map(userId => {
      const obj = whiteboardObjects.find(o => o.created_by === userId);
      return {
        id: userId,
        name: obj?.profiles?.full_name || 'Anonymous',
        avatar: obj?.profiles?.avatar_url,
      };
    });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5" />
            {whiteboard.name}
            <Badge variant="secondary">
              {whiteboardObjects.filter(obj => obj.whiteboard_id === whiteboard.id && !obj.is_deleted).length} objects
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="flex -space-x-2">
              {getActiveUsers().slice(0, 3).map((user) => (
                <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback className="text-xs">
                    {user.name[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <div className="flex items-center gap-1">
            <Button
              variant={activeTool === 'select' ? "default" : "ghost"}
              size="sm"
              onClick={() => handleToolClick('select')}
            >
              <Move className="h-4 w-4" />
            </Button>
            <Button
              variant={activeTool === 'draw' ? "default" : "ghost"}
              size="sm"
              onClick={() => handleToolClick('draw')}
            >
              <Paintbrush className="h-4 w-4" />
            </Button>
            <Button
              variant={activeTool === 'rectangle' ? "default" : "ghost"}
              size="sm"
              onClick={() => handleToolClick('rectangle')}
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button
              variant={activeTool === 'circle' ? "default" : "ghost"}
              size="sm"
              onClick={() => handleToolClick('circle')}
            >
              <Circle className="h-4 w-4" />
            </Button>
            <Button
              variant={activeTool === 'text' ? "default" : "ghost"}
              size="sm"
              onClick={() => handleToolClick('text')}
            >
              <Type className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Color palette */}
          <div className="flex items-center gap-1">
            <Palette className="h-4 w-4 text-muted-foreground" />
            {colors.map((color) => (
              <button
                key={color}
                className={`w-6 h-6 rounded border-2 ${
                  activeColor === color ? 'border-foreground' : 'border-muted'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setActiveColor(color)}
              />
            ))}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Brush size */}
          {activeTool === 'draw' && (
            <div className="flex items-center gap-2">
              <span className="text-sm">Size:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-16"
              />
              <span className="text-sm w-6">{brushSize}</span>
            </div>
          )}

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleDeleteSelected}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <Eraser className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 border border-border rounded-lg overflow-hidden bg-background">
          <canvas ref={canvasRef} className="max-w-full max-h-full" />
        </div>
      </CardContent>
    </Card>
  );
};