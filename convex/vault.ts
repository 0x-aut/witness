import { query } from "./_generated/server";
import { getCurrentUser } from "./agents/threads";

export const list = query({
  args: {},

  handler: async ctx => {
    const user = await getCurrentUser(ctx);

    const cases = await ctx.db
      .query("cases")
      .withIndex("by_user_id", q =>
        q.eq("userId", user._id),
      )
      .order("desc")
      .collect();

    return await Promise.all(
      cases.map(async caseData => {
        const files = await ctx.db
          .query("files")
          .withIndex("by_case_id", q =>
            q.eq("caseId", caseData._id),
          )
          .collect();

        const widgets = await ctx.db
          .query("caseWidgets")
          .withIndex("by_case_id", q =>
            q.eq("caseId", caseData._id),
          )
          .order("asc")
          .collect();

        const documents = await Promise.all(
          files.map(async file => ({
            id: file._id,
            filename: file.filename,
            mimeType: file.mimeType,
            size: file.size,
            storageId: file.storageId,
            url: await ctx.storage.getUrl(
              file.storageId,
            ),
          })),
        );

        const websites = widgets
          .filter(
            widget =>
              widget.type === "link" ||
              widget.type === "research",
          )
          .map(widget => {
            const data =
              (widget.data ?? {}) as Record<string, unknown>;

            return {
              id: widget._id,
              type: widget.type,
              url:
                typeof data.url === "string"
                  ? data.url
                  : typeof data.sourceUrl === "string"
                    ? data.sourceUrl
                    : null,
              title:
                typeof data.title === "string"
                  ? data.title
                  : null,
              description:
                typeof data.description === "string"
                  ? data.description
                  : null,
              image:
                typeof data.image === "string"
                  ? data.image
                  : null,
              favicon:
                typeof data.favicon === "string"
                  ? data.favicon
                  : null,
            };
          })
          .filter(website => !!website.url);

        return {
          caseData,
          documents,
          websites,
        };
      }),
    );
  },
});