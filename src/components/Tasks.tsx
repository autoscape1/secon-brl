import React from 'react';
import { motion } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Entry } from '../types';
import { db, updateDoc, doc, handleFirestoreError, OperationType } from '../firebase';
import { formatDistanceToNow } from 'date-fns';
import SpotlightCard from './SpotlightCard';

interface TasksProps {
  entries: Entry[];
  onSelectEntry: (entry: Entry) => void;
  theme: 'journal' | 'noir';
}

const Tasks: React.FC<TasksProps> = ({ entries, onSelectEntry, theme }) => {
  const isNoir = theme === 'noir';
  const tasks = entries.filter(e => e.type === 'task');
  
  const columns = {
    pending: {
      title: 'Registered',
      items: tasks.filter(t => t.status === 'pending'),
    },
    working: {
      title: 'Working On',
      items: tasks.filter(t => t.status === 'working'),
    },
    done: {
      title: 'Done',
      items: tasks.filter(t => t.status === 'done'),
    },
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'entries', id), { 
        status: status as 'pending' | 'working' | 'done', 
        updatedAt: new Date() 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `entries/${id}`);
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Update status if moved to a different column
    if (destination.droppableId !== source.droppableId) {
      updateStatus(draggableId, destination.droppableId);
    }
  };

  return (
    <div className="notebook-margin pt-6 pb-20 max-w-7xl px-8 transition-all duration-500">
      <header className="mb-16 flex justify-between items-end">
        <div className="relative">
          <h2 className={`text-6xl font-headline font-black tracking-tight transition-all duration-500 ${
            isNoir ? 'text-white' : 'text-primary italic'
          }`}>
            Tasks to be done
          </h2>
          <div className="mt-6 flex items-center gap-6">
            <span className={`px-4 py-1 text-xs font-bold rounded-full transition-all duration-500 ${
              isNoir ? 'bg-[#FF3B30] text-white' : 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
            }`}>
              {tasks.length} Total
            </span>
            <span className={`text-sm italic font-medium tracking-wide transition-colors duration-500 ${
              isNoir ? 'text-white/30' : 'text-primary/40'
            }`}>
              Last modified: {formatDistanceToNow(new Date())} ago
            </span>
          </div>
        </div>
      </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[15px]">
          {Object.entries(columns).map(([columnId, column]) => (
            <section key={columnId} className="relative">
              <div className="mb-8 flex items-center gap-2">
                <h3 className={`text-xl font-headline font-extrabold uppercase tracking-widest transition-colors duration-500 ${
                  isNoir 
                    ? (columnId === 'done' ? 'text-white/20' : columnId === 'working' ? 'text-white' : 'text-white/60') 
                    : (columnId === 'done' ? 'text-primary opacity-50' : 'text-primary')
                }`}>
                  {column.title}
                </h3>
              </div>
              
              <Droppable droppableId={columnId}>
                {(provided, snapshot) => (
                  <SpotlightCard 
                    theme={theme}
                    variant="inset"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[600px] p-6 flex flex-col transition-all duration-500 rounded-3xl border-none ${
                      columnId === 'done' ? 'grayscale opacity-40' : ''
                    } ${snapshot.isDraggingOver ? 'ring-2 ring-primary/20' : ''}`}
                  >
                    {column.items.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              marginBottom: '15px'
                            }}
                          >
                            <TaskCard 
                              task={task} 
                              onSelect={onSelectEntry} 
                              isActive={columnId === 'working'}
                              isDone={columnId === 'done'} 
                              theme={theme} 
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </SpotlightCard>
                )}
              </Droppable>
            </section>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

const TaskCard = ({ task, onSelect, isActive, isDone, theme }: { task: Entry, onSelect: (e: Entry) => void, isActive?: boolean, isDone?: boolean, theme: 'journal' | 'noir' }) => {
  const isNoir = theme === 'noir';
  return (
    <SpotlightCard
      theme={theme}
      variant="flat"
      onClick={() => onSelect(task)}
      className={`transition-all duration-500 cursor-pointer relative group p-6 rounded-2xl border-none ${
        isNoir 
          ? `hover:bg-white/5 ${isActive ? 'nm-accent' : ''} ${isDone ? 'opacity-40 line-through decoration-white/40' : ''}`
          : `hover:nm-convex ${isActive ? 'ring-2 ring-secondary-container' : isDone ? 'opacity-60 line-through decoration-primary/40' : ''}`
      }`}
    >
      {isDone && (
        <div className={`absolute -top-2 -right-2 rounded-full border p-1 transition-all duration-500 ${
          isNoir ? 'bg-[#FF3B30] border-white/20' : 'bg-surface-container-lowest border-primary/20'
        }`}>
          <span className={`material-symbols-outlined text-sm ${isNoir ? 'text-white' : 'text-green-600'}`}>check</span>
        </div>
      )}
      <div className="flex justify-between items-start mb-4">
        <span className={`text-[10px] font-bold tracking-tighter transition-colors duration-500 ${
          isNoir ? 'text-white/20' : 'text-primary/40'
        }`}>ID-{task.id.slice(0, 4)}</span>
      </div>
      <h4 className={`font-bold transition-all duration-500 ${
        isNoir ? 'text-white' : 'text-primary'
      } mb-3 ${isDone ? (isNoir ? 'text-white/40' : 'text-primary/60') : ''}`}>{task.title || task.content}</h4>
      {!isDone && task.content.length > 50 && (
        <p className={`text-xs italic line-clamp-2 transition-colors duration-500 ${
          isNoir ? 'text-white/40' : 'text-primary/60'
        }`}>{task.content}</p>
      )}
      <div className="flex gap-2 mt-6">
        <div className={`w-4 h-4 rounded-full transition-all duration-500 ${
          isNoir 
            ? (isActive ? 'bg-[#FF3B30] shadow-[0_0_10px_rgba(255,59,48,0.5)]' : 'bg-white/10') 
            : (isActive ? 'bg-secondary-container' : 'bg-primary/40')
        }`}></div>
        <div className={`w-4 h-4 rounded-full border transition-all duration-500 ${
          isNoir ? 'border-white/10' : 'border-primary/20'
        }`}></div>
      </div>
    </SpotlightCard>
  );
};

export default Tasks;
