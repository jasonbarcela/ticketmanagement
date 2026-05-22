import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function UserTable({ users, onStatusChange, onRefresh }) {
  const getBadgeVariant = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "default"
      case "pending":
        return "secondary"
      case "disabled":
        return "destructive"
      default:
        return "default"
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.user_id || user.id}>
              <TableCell className="font-medium">{user.username}</TableCell>
              <TableCell className="capitalize">{user.role}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={getBadgeVariant(user.status)}>
                  {user.status || 'Active'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {user.status?.toLowerCase() === 'disabled' ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onStatusChange(user.user_id || user.id, 'active')}
                  >
                    Enable
                  </Button>
                ) : (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => onStatusChange(user.user_id || user.id, 'disabled')}
                  >
                    Disable
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No users found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
