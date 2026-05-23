import React from 'react';
import { Comment, commentsService } from '../../services/commentsService';
import { SendRegular, EditRegular, DeleteRegular, ChevronRightRegular } from '@fluentui/react-icons';

interface CommentsProps {
  entityId: string;
  readOnly?: boolean;
  onCollapse?: () => void;
}

export const Comments: React.FC<CommentsProps> = ({ entityId, readOnly = false, onCollapse }) => {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [newComment, setNewComment] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingContent, setEditingContent] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const currentUser = sessionStorage.getItem('emailEditor:currentUser') || 'me';

  const fetchComments = React.useCallback(async () => {
    if (!entityId) return;
    setIsLoading(true);
    try {
      const result = await commentsService.getComments(entityId);
      setComments(result);
    } finally {
      setIsLoading(false);
    }
  }, [entityId]);

  React.useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  const handleAdd = async () => {
    const trimmed = newComment.trim();
    if (!trimmed || !entityId) return;
    await commentsService.addComment(entityId, trimmed);
    setNewComment('');
    void fetchComments();
  };

  const handleEdit = async (commentId: string) => {
    const trimmed = editingContent.trim();
    if (!trimmed) return;
    await commentsService.editComment(commentId, trimmed);
    setEditingId(null);
    setEditingContent('');
    void fetchComments();
  };

  const handleDelete = async (commentId: string) => {
    await commentsService.deleteComment(commentId);
    void fetchComments();
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditingContent(comment.content);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today ${time}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
  };

  if (!entityId) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span>Comments</span>
          {onCollapse && (
            <button type="button" onClick={onCollapse} style={styles.collapseBtn} title="Collapse comments">
              <ChevronRightRegular style={{ fontSize: 16 }} />
            </button>
          )}
        </div>
        <p style={styles.empty}>Comments can only be added to documents in draft state.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>Comments ({comments.length})</span>
        {onCollapse && (
          <button type="button" onClick={onCollapse} style={styles.collapseBtn} title="Collapse comments">
            <ChevronRightRegular style={{ fontSize: 16 }} />
          </button>
        )}
      </div>

      {/* New comment input or read-only notice */}
      {readOnly ? (
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#605e5c', fontStyle: 'italic' }}>
          Comments can only be added to documents in draft state.
        </p>
      ) : (
        <div style={styles.inputRow}>
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="@mention or comment"
            style={styles.input}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handleAdd();
              }
            }}
          />
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={!newComment.trim()}
            style={{ ...styles.sendBtn, opacity: newComment.trim() ? 1 : 0.4 }}
            title="Send"
          >
            <SendRegular />
          </button>
        </div>
      )}

      {/* Comments list */}
      {isLoading && <p style={styles.empty}>Loading…</p>}
      {!isLoading && comments.length === 0 && (
        <p style={styles.emptyCenter}>No comments yet</p>
      )}
      <div style={styles.list}>
        {comments.map((comment) => (
          <div key={comment.id} style={styles.commentCard}>
            <div style={styles.commentHeader}>
              <span style={styles.author}>{comment.author}</span>
              <span style={styles.timestamp}>
                {formatDate(comment.createdAt)}
                {comment.isEdited && <span style={{ fontStyle: 'italic' }}> (edited)</span>}
              </span>
              {!readOnly && comment.author === currentUser && editingId !== comment.id && (
                <span style={styles.actions}>
                  <button type="button" style={styles.actionBtn} onClick={() => startEdit(comment)} title="Edit">
                    <EditRegular style={{ fontSize: 14 }} />
                  </button>
                  <button type="button" style={styles.actionBtn} onClick={() => void handleDelete(comment.id)} title="Delete">
                    <DeleteRegular style={{ fontSize: 14 }} />
                  </button>
                </span>
              )}
            </div>
            {editingId === comment.id ? (
              <div style={{ marginTop: 6 }}>
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  rows={2}
                  style={styles.textarea}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button type="button" style={styles.saveBtn} onClick={() => void handleEdit(comment.id)}>Save</button>
                  <button type="button" style={styles.cancelBtn} onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={styles.commentContent}>{comment.content}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '16px 16px',
    fontFamily: '"Segoe UI", sans-serif',
    fontSize: 13,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 14,
    fontWeight: 600,
    color: '#323130',
    marginBottom: 16,
  },
  collapseBtn: {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: '#323130',
    padding: 4,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 16,
    border: '1px solid #8a8886',
    borderRadius: 4,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    padding: '8px 10px',
    border: 'none',
    outline: 'none',
    fontFamily: '"Segoe UI", sans-serif',
    fontSize: 13,
    color: '#323130',
  },
  sendBtn: {
    border: 'none',
    background: 'none',
    color: '#605e5c',
    cursor: 'pointer',
    padding: '6px 10px',
    fontSize: 16,
  },
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  commentCard: {
    padding: '8px 10px',
    backgroundColor: '#f3f2f1',
    borderRadius: 4,
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  author: {
    fontWeight: 600,
    color: '#323130',
    fontSize: 12,
  },
  timestamp: {
    color: '#605e5c',
    fontSize: 11,
    flex: 1,
  },
  actions: {
    display: 'flex',
    gap: 2,
  },
  actionBtn: {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: '#605e5c',
    padding: 2,
  },
  commentContent: {
    marginTop: 4,
    color: '#323130',
    whiteSpace: 'pre-wrap' as const,
    lineHeight: 1.4,
  },
  empty: {
    color: '#605e5c',
    fontStyle: 'italic',
    margin: '8px 0',
  },
  emptyCenter: {
    color: '#0078d4',
    textAlign: 'center' as const,
    margin: '24px 0',
    fontSize: 13,
  },
  saveBtn: {
    padding: '4px 10px',
    fontSize: 12,
    borderRadius: 4,
    border: 'none',
    backgroundColor: '#0078d4',
    color: '#fff',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '4px 10px',
    fontSize: 12,
    borderRadius: 4,
    border: '1px solid #8a8886',
    backgroundColor: '#fff',
    color: '#323130',
    cursor: 'pointer',
  },
};
