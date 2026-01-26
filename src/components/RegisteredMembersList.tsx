import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SecureAvatar } from '@/components/SecureAvatar';
import { ExaminationBadge } from '@/components/ExaminationBadge';
import { Loader2, Phone, GraduationCap, Building, Hash } from 'lucide-react';
import { RegisteredMember } from '@/hooks/useActivities';
import { useExaminations } from '@/hooks/useExaminations';
import { format } from 'date-fns';

interface RegisteredMembersListProps {
  members: RegisteredMember[];
  isLoading: boolean;
  title?: string;
}

export function RegisteredMembersList({ members, isLoading, title = 'Registered Members' }: RegisteredMembersListProps) {
  const { getUserExaminationBadge } = useExaminations();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No members registered yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground">{title} ({members.length})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {members.map((member) => {
          const examBadge = getUserExaminationBadge(member.user_id);
          return (
            <Card key={member.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <SecureAvatar
                    src={null}
                    fallback={`${member.first_name[0]}${member.last_name?.[0] || ''}`}
                    className="h-10 w-10"
                    fallbackClassName="bg-primary text-primary-foreground text-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-foreground">
                        {member.first_name} {member.last_name}
                      </h4>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {member.uid}
                      </Badge>
                      {examBadge && (
                        <ExaminationBadge 
                          stageName={examBadge.stageName} 
                          status={examBadge.status}
                          size="sm"
                        />
                      )}
                    </div>
                    
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {member.enrollment_number && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Hash className="h-3 w-3" />
                          <span className="truncate">{member.enrollment_number}</span>
                        </div>
                      )}
                      {member.current_semester && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <GraduationCap className="h-3 w-3" />
                          <span>Sem {member.current_semester}</span>
                        </div>
                      )}
                      {member.whatsapp_number && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{member.whatsapp_number}</span>
                        </div>
                      )}
                      {member.college_name && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Building className="h-3 w-3" />
                          <span className="truncate">{member.college_name}</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      Registered: {format(new Date(member.registered_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
