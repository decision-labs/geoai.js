# New Model Documentation Checklist

## 📋 Pre-Documentation Setup

- [ ] **Create video demo** (MP4 format)
- [ ] **Upload video to S3**: `aws s3 cp ./video/demo.mp4 s3://geobase-docs/geobase-ai-assets/`
- [ ] **Verify S3 upload**: `aws s3 ls s3://geobase-docs/geobase-ai-assets/demo.mp4`

## 📝 Documentation Page

- [ ] **Create MDX file**: `docs/pages/supported-tasks/new-model.mdx`
- [ ] **Add video embed** at top of page:

  ```jsx
  import VideoEmbed from "../../components/video-embed";

  <VideoEmbed
    src="https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/demo.mp4"
    title="Model Demo"
  />;
  ```

- [ ] **Add to navigation**: Update `docs/pages/supported-tasks/_meta.js`
- [ ] **Include Quick Start** code example
- [ ] **Document parameters** and configuration
- [ ] **Show output format** with examples

## ✅ Final Checks

- [ ] **Test video autoplay** on documentation page
- [ ] **Verify S3 video URL** is accessible
- [ ] **Check navigation** appears correctly
- [ ] **Review code examples** for accuracy

---

**Video URL Format**: `https://geobase-docs.s3.amazonaws.com/geobase-ai-assets/[filename].mp4`
