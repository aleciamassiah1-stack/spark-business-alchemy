import { submitServiceRequest, type RequestType } from "@/lib/service-requests.functions";
import { sendTransactionalEmail } from "@/lib/email/send";

type SubmitArgs = {
  type: RequestType;
  subject: string;
  body?: Record<string, unknown>;
  profileId?: string;
};

/**
 * Insert a service_request row AND fire the admin email notification.
 * The DB row is the source of truth; the email is best-effort.
 */
export async function submitServiceRequestWithEmail(args: SubmitArgs) {
  const pageUrl = typeof window !== "undefined" ? window.location.href : undefined;
  const res = await submitServiceRequest({
    data: {
      type: args.type,
      subject: args.subject,
      body: args.body,
      profileId: args.profileId,
      pageUrl,
    },
  });

  // Fire-and-forget admin email; never block the user on email delivery.
  void sendTransactionalEmail({
    templateName: "service-request-notification",
    idempotencyKey: `svc-${res.id}`,
    templateData: {
      requestType: args.type,
      subject: args.subject,
      fromName: res.memberName,
      fromEmail: res.memberEmail,
      body:
        typeof args.body?.message === "string"
          ? args.body.message
          : JSON.stringify(args.body ?? {}, null, 2),
      requestId: res.id,
      pageUrl,
      adminUrl:
        typeof window !== "undefined"
          ? `${window.location.origin}/admin/requests`
          : undefined,
    },
  }).catch(() => {
    /* email is best-effort; the row already exists */
  });

  return res;
}
