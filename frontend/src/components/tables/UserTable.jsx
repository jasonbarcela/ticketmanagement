import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/Table'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export default function UserTable({ users = [], onStatusChange, onRefresh }) {
  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'disabled':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const handleToggleStatus = (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active'
    onStatusChange(userId, newStatus)
  }

  if (!users || users.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card">
        <div className="p-4 text-center text-sm text-muted-foreground">
          No users found
        </div>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.user_id}>
            <TableCell className="font-medium">{user.username}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell className="capitalize">{user.role}</TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(user.status)}>
                {user.status}
              </Badge>
            </TableCell>
            <TableCell>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleStatus(user.user_id, user.status)}
              >
                {user.status === 'active' ? 'Disable' : 'Enable'}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
